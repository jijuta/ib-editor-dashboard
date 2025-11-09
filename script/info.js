#!/usr/bin/env node

const { Client } = require('@opensearch-project/opensearch');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuration
const OPENSEARCH_CONFIG = {
    node: process.env.OPENSEARCH_URL || 'http://opensearch:9200',
    auth: {
        username: process.env.OPENSEARCH_USERNAME || 'admin',
        password: process.env.OPENSEARCH_PASSWORD || 'Admin@123456'
    },
    ssl: {
        rejectUnauthorized: false
    }
};

const POSTGRES_CONFIG = {
    host: process.env.POSTGRES_HOST || 'postgres',
    port: process.env.POSTGRES_PORT || 5432,
    database: process.env.POSTGRES_DB || 'n8n',
    user: process.env.POSTGRES_USER || 'n8n',
    password: process.env.POSTGRES_PASSWORD || 'n8n123'
};

// Initialize clients
const osClient = new Client(OPENSEARCH_CONFIG);
const pgPool = new Pool(POSTGRES_CONFIG);

class IncidentAnalyzer {
    constructor(incidentId) {
        this.incidentId = incidentId;
        this.result = {
            incident_id: incidentId,
            timestamp: new Date().toISOString(),
            incident_info: null,
            mitre_details: [],
            alerts: [],
            files: [],
            networks: [],
            processes: [],
            registries: [],
            endpoints: [],
            cves: [],
            threat_intelligence_summary: {
                total_matches: 0,
                malware_matches: 0,
                ioc_matches: 0,
                cve_matches: 0,
                apt_matches: 0,
                tool_matches: 0,
                mitre_matches: 0
            }
        };
    }

    async analyzeIncident(outputMode = 'summary') {
        try {
            console.log(`🔍 Analyzing incident: ${this.incidentId}`);
            console.log(`📄 Output mode: ${outputMode}`);

            // Step 1: Get incident basic information
            await this.getIncidentInfo();

            // Step 2: Get MITRE details from PostgreSQL
            await this.getMitreDetails();

            // Step 3: Get all related artifacts
            await this.getAlerts();
            await this.getFiles();
            await this.getNetworks();
            await this.getProcesses();
            await this.getRegistries();
            await this.getEndpoints();
            await this.getCVEs();  // Get CVE vulnerabilities for affected hosts

            // Step 4: Output results
            this.outputResults(outputMode);

        } catch (error) {
            console.error('❌ Analysis failed:', error.message);
            process.exit(1);
        } finally {
            await pgPool.end();
        }
    }

    async getIncidentInfo() {
        console.log('📋 Fetching incident information...');

        const query = {
            index: 'logs-cortex_xdr-incidents-*',
            body: {
                query: {
                    term: {
                        'incident_id.keyword': this.incidentId
                    }
                },
                size: 1,
                sort: [{ '@timestamp': { order: 'desc' } }]
            }
        };

        try {
            const response = await osClient.search(query);
            if (response.body.hits.hits.length > 0) {
                this.result.incident_info = response.body.hits.hits[0]._source;
                console.log(`✅ Found incident: ${this.result.incident_info.name || 'Unknown'}`);
            } else {
                console.log('⚠️  No incident found with this ID');
                this.result.incident_info = { error: 'Incident not found' };
            }
        } catch (error) {
            console.error('❌ Error fetching incident info:', error.message);
            this.result.incident_info = { error: error.message };
        }
    }

    async getMitreDetails() {
        console.log('🎯 Fetching MITRE ATT&CK details...');

        try {
            let mitreIds = [];

            // Extract MITRE technique IDs from incident info
            if (this.result.incident_info) {
                // Check mitre_techniques_ids_and_names field
                if (this.result.incident_info.mitre_techniques_ids_and_names) {
                    const techniques = Array.isArray(this.result.incident_info.mitre_techniques_ids_and_names)
                        ? this.result.incident_info.mitre_techniques_ids_and_names
                        : [this.result.incident_info.mitre_techniques_ids_and_names];

                    techniques.forEach(technique => {
                        if (typeof technique === 'string') {
                            // Extract ID from "T1071.001 - Application Layer Protocol: Web Protocols"
                            const match = technique.match(/^(T\d+\.?\d*)/);
                            if (match) {
                                mitreIds.push(match[1]);
                            }
                        }
                    });
                }

                // Also check mitre_techniques field (backup)
                if (this.result.incident_info.mitre_techniques) {
                    const backup = Array.isArray(this.result.incident_info.mitre_techniques)
                        ? this.result.incident_info.mitre_techniques
                        : [this.result.incident_info.mitre_techniques];
                    mitreIds.push(...backup);
                }
            }

            console.log(`🔍 Found MITRE technique IDs: ${mitreIds.join(', ')}`);

            // Query PostgreSQL for each MITRE technique
            for (const mitreId of mitreIds) {
                if (mitreId && mitreId.trim()) {
                    console.log(`  🔎 Querying MITRE technique: ${mitreId}`);
                    const query = `
                        SELECT technique_id, technique_name, tactic, description, platform
                        FROM threat_intelligence.ti_mitre
                        WHERE technique_id = $1
                    `;
                    const res = await pgPool.query(query, [mitreId.trim()]);
                    console.log(`  📊 MITRE query result: ${res.rows.length} matches`);
                    if (res.rows.length > 0) {
                        this.result.mitre_details.push(res.rows[0]);
                        console.log(`  ✅ Found MITRE technique: ${res.rows[0].technique_name}`);
                    }
                }
            }
            console.log(`✅ Total MITRE technique details: ${this.result.mitre_details.length}`);
        } catch (error) {
            console.error('❌ Error fetching MITRE details:', error.message);
        }
    }

    async getAlerts() {
        console.log('🚨 Fetching alerts...');
        await this.fetchArtifacts('logs-cortex_xdr-alerts-*', 'alerts');
    }

    async getFiles() {
        console.log('📁 Fetching file artifacts...');
        await this.fetchArtifacts('logs-cortex_xdr-file-*', 'files');
    }

    async getNetworks() {
        console.log('🌐 Fetching network artifacts...');
        await this.fetchArtifacts('logs-cortex_xdr-network-*', 'networks');
    }

    async getProcesses() {
        console.log('⚙️  Fetching process artifacts...');
        await this.fetchArtifacts('logs-cortex_xdr-process-*', 'processes');
    }

    async getRegistries() {
        console.log('📝 Fetching registry artifacts...');
        await this.fetchArtifacts('logs-cortex_xdr-registry-*', 'registries');
    }

    async getEndpoints() {
        const endpointIds = new Set();

        // Extract endpoint IDs from hosts array (format: "hostname:endpoint_id")
        if (this.result.incident_info && this.result.incident_info.hosts) {
            console.log('🔍 Extracting endpoint IDs from hosts...');
            for (const host of this.result.incident_info.hosts) {
                if (typeof host === 'string' && host.includes(':')) {
                    const parts = host.split(':');
                    if (parts.length === 2) {
                        endpointIds.add(parts[1]);
                        console.log(`  📌 Found endpoint ID: ${parts[1]} (host: ${parts[0]})`);
                    }
                }
            }
        }

        // Also check for endpoint_id field (fallback)
        if (this.result.incident_info && this.result.incident_info.endpoint_id) {
            endpointIds.add(this.result.incident_info.endpoint_id);
            console.log(`  📌 Found endpoint ID from field: ${this.result.incident_info.endpoint_id}`);
        }

        if (endpointIds.size === 0) {
            console.log('⚠️  No endpoint IDs found');
            return;
        }

        console.log(`💻 Fetching information for ${endpointIds.size} endpoint(s)...`);

        const query = {
            index: 'logs-cortex_xdr-endpoints-*',
            body: {
                query: {
                    terms: {
                        'endpoint_id.keyword': Array.from(endpointIds)
                    }
                },
                size: 100,
                sort: [{ '@timestamp': { order: 'desc' } }]
            }
        };

        try {
            const response = await osClient.search(query);
            const endpoints = response.body.hits.hits.map(hit => {
                const source = hit._source;
                // Extract key information for better visibility
                return {
                    endpoint_id: source.endpoint_id,
                    endpoint_name: source.endpoint_name,
                    operating_system: source.operating_system,
                    os_version: source.os_version,
                    ip_addresses: source.ip || [],
                    public_ip: source.public_ip,
                    mac_addresses: source.mac_address || [],
                    domain: source.domain,
                    users: source.users || [],
                    endpoint_status: source.endpoint_status,
                    operational_status: source.operational_status,
                    is_isolated: source.is_isolated,
                    scan_status: source.scan_status,
                    endpoint_version: source.endpoint_version,
                    content_version: source.content_version,
                    content_status: source.content_status,
                    assigned_prevention_policy: source.assigned_prevention_policy,
                    assigned_extensions_policy: source.assigned_extensions_policy,
                    group_name: source.group_name || [],
                    endpoint_type: source.endpoint_type,
                    last_seen: source.last_seen ? new Date(source.last_seen).toISOString() : null,
                    first_seen: source.first_seen ? new Date(source.first_seen).toISOString() : null,
                    install_date: source.install_date ? new Date(source.install_date).toISOString() : null,
                    last_content_update_time: source.last_content_update_time ? new Date(source.last_content_update_time).toISOString() : null,
                    raw_source: source  // Keep original data for reference
                };
            });

            this.result.endpoints = endpoints;
            console.log(`✅ Found ${this.result.endpoints.length} endpoint record(s)`);

            // Log summary of each endpoint
            for (const ep of endpoints) {
                console.log(`  💻 ${ep.endpoint_name}: ${ep.operating_system} (${ep.ip_addresses.join(', ')})`);
                console.log(`     Status: ${ep.operational_status} | Policy: ${ep.assigned_prevention_policy}`);
            }
        } catch (error) {
            console.error('❌ Error fetching endpoints:', error.message);
            this.result.endpoints = [];
        }
    }

    async getCVEs() {
        const hostnames = new Set();

        // Extract hostnames from endpoints
        if (this.result.endpoints && this.result.endpoints.length > 0) {
            for (const endpoint of this.result.endpoints) {
                if (endpoint.endpoint_name) {
                    hostnames.add(endpoint.endpoint_name);
                }
            }
        }

        // Also extract from hosts array (fallback)
        if (this.result.incident_info && this.result.incident_info.hosts) {
            for (const host of this.result.incident_info.hosts) {
                if (typeof host === 'string' && host.includes(':')) {
                    const hostname = host.split(':')[0];
                    if (hostname) {
                        hostnames.add(hostname);
                    }
                }
            }
        }

        if (hostnames.size === 0) {
            console.log('⚠️  No hostnames found for CVE lookup');
            this.result.cves = [];
            return;
        }

        console.log(`🔒 Fetching CVE vulnerabilities for ${hostnames.size} host(s)...`);
        console.log(`  📌 Hosts: ${Array.from(hostnames).join(', ')}`);

        const cves = [];

        for (const hostname of hostnames) {
            const query = {
                index: 'logs-cortex_xdr-va-cves-*',
                body: {
                    query: {
                        match: {
                            'affected_hosts': hostname
                        }
                    },
                    size: 10,
                    sort: [{ 'severity_score': { order: 'desc' } }]
                }
            };

            try {
                const response = await osClient.search(query);
                if (response.body.hits.hits.length > 0) {
                    console.log(`  🎯 Found ${response.body.hits.hits.length} CVEs for ${hostname}`);

                    for (const hit of response.body.hits.hits) {
                        const cve = hit._source;
                        cves.push({
                            hostname: hostname,
                            cve_id: cve.cve_id,
                            name: cve.name,
                            description: cve.description,
                            severity: cve.severity,
                            severity_score: cve.severity_score,
                            exploitability_score: cve.exploitability_score,
                            impact_score: cve.impact_score,
                            affected_products: cve.affected_products || [],
                            type: cve.type,
                            confidentiality: cve.confidentiality,
                            integrity: cve.integrity,
                            availability: cve.availability,
                            publication_date: cve.publication_date,
                            modification_date: cve.modification_date
                        });
                    }
                }
            } catch (error) {
                console.error(`❌ Error fetching CVEs for ${hostname}:`, error.message);
            }
        }

        // Sort by severity score
        cves.sort((a, b) => b.severity_score - a.severity_score);

        this.result.cves = cves;
        console.log(`✅ Found total ${cves.length} CVE vulnerabilities`);

        // Log summary of critical/high CVEs
        const criticalCves = cves.filter(c => c.severity === 'CRITICAL' || c.severity_score >= 9);
        const highCves = cves.filter(c => c.severity === 'HIGH' || (c.severity_score >= 7 && c.severity_score < 9));
        const mediumCves = cves.filter(c => c.severity === 'MEDIUM' || (c.severity_score >= 4 && c.severity_score < 7));
        const lowCves = cves.filter(c => c.severity === 'LOW' || c.severity_score < 4);

        if (criticalCves.length > 0) {
            console.log(`  🔴 Critical CVEs: ${criticalCves.length}`);
            for (const cve of criticalCves.slice(0, 3)) {
                console.log(`     - ${cve.name} (Score: ${cve.severity_score}): ${cve.description?.substring(0, 80)}...`);
            }
        }
        if (highCves.length > 0) {
            console.log(`  🟠 High CVEs: ${highCves.length}`);
        }
        if (mediumCves.length > 0) {
            console.log(`  🟡 Medium CVEs: ${mediumCves.length}`);
        }
        if (lowCves.length > 0) {
            console.log(`  🟢 Low CVEs: ${lowCves.length}`);
        }
    }

    async fetchArtifacts(index, resultKey) {
        const query = {
            index: index,
            body: {
                query: {
                    term: {
                        'incident_id.keyword': this.incidentId
                    }
                },
                size: 1000,
                sort: [{ '@timestamp': { order: 'desc' } }]
            }
        };

        try {
            const response = await osClient.search(query);
            const artifacts = response.body.hits.hits.map(hit => hit._source);

            // Add threat intelligence correlation
            for (let artifact of artifacts) {
                artifact.threat_intelligence_matches = await this.correlateThreatIntelligence(artifact, resultKey);
            }

            this.result[resultKey] = artifacts;
            console.log(`✅ Found ${artifacts.length} ${resultKey} with threat intelligence correlation`);
        } catch (error) {
            console.error(`❌ Error fetching ${resultKey}:`, error.message);
            this.result[resultKey] = [];
        }
    }

    async correlateThreatIntelligence(artifact, artifactType) {
        const matches = {
            malware: [],
            ioc: [],
            cve: [],
            apt_groups: [],
            tools: [],
            mitre: []
        };

        console.log(`🔍 Correlating threat intelligence for ${artifactType}...`);

        try {
            // Check for malware matches (file hashes)
            if (artifact.file_hash || artifact.sha256 || artifact.md5) {
                const hash = artifact.file_hash || artifact.sha256 || artifact.md5;
                console.log(`  🔎 Checking hash: ${hash}`);
                const malwareQuery = `
                    SELECT hash, family, verdict, source
                    FROM threat_intelligence.ti_malware
                    WHERE hash = $1
                `;
                const malwareRes = await pgPool.query(malwareQuery, [hash]);
                console.log(`  📊 Malware query result: ${malwareRes.rows.length} matches`);
                if (malwareRes.rows.length > 0) {
                    matches.malware = malwareRes.rows;
                    this.result.threat_intelligence_summary.malware_matches++;
                    console.log(`  ✅ Found malware match: ${malwareRes.rows[0].family}`);
                }
            }

            // Check for IoC matches (IPs, domains, URLs)
            if (artifact.remote_ip || artifact.domain || artifact.url || artifact.action_remote_ip || artifact.action_external_hostname) {
                const indicator = artifact.remote_ip || artifact.domain || artifact.url || artifact.action_remote_ip || artifact.action_external_hostname;
                console.log(`  🔎 Checking IoC: ${indicator}`);
                const iocQuery = `
                    SELECT indicator, type, threat_type, source, confidence
                    FROM threat_intelligence.ti_ioc
                    WHERE indicator = $1
                `;
                const iocRes = await pgPool.query(iocQuery, [indicator]);
                console.log(`  📊 IoC query result: ${iocRes.rows.length} matches`);
                if (iocRes.rows.length > 0) {
                    matches.ioc = iocRes.rows;
                    this.result.threat_intelligence_summary.ioc_matches++;
                    console.log(`  ✅ Found IoC match: ${iocRes.rows[0].threat_type}`);
                }
            }

            // Check for CVE matches
            if (artifact.cve_id) {
                const cveQuery = `
                    SELECT cve_id, description, cvss_score, severity
                    FROM threat_intelligence.ti_cve
                    WHERE cve_id = $1
                `;
                const cveRes = await pgPool.query(cveQuery, [artifact.cve_id]);
                if (cveRes.rows.length > 0) {
                    matches.cve = cveRes.rows;
                    this.result.threat_intelligence_summary.cve_matches++;
                }
            }

            // Check for APT group matches
            if (artifact.actor_name || artifact.threat_actor) {
                const actor = artifact.actor_name || artifact.threat_actor;
                const aptQuery = `
                    SELECT group_name, aliases, description, country
                    FROM threat_intelligence.ti_apt_groups
                    WHERE group_name ILIKE $1 OR aliases ILIKE $1
                `;
                const aptRes = await pgPool.query(aptQuery, [`%${actor}%`]);
                if (aptRes.rows.length > 0) {
                    matches.apt_groups = aptRes.rows;
                    this.result.threat_intelligence_summary.apt_matches++;
                }
            }

            // Check for tool matches
            if (artifact.process_name || artifact.tool_name) {
                const tool = artifact.process_name || artifact.tool_name;
                const toolQuery = `
                    SELECT tool_name, category, description, mitre_id
                    FROM threat_intelligence.ti_tools
                    WHERE tool_name ILIKE $1
                `;
                const toolRes = await pgPool.query(toolQuery, [`%${tool}%`]);
                if (toolRes.rows.length > 0) {
                    matches.tools = toolRes.rows;
                    this.result.threat_intelligence_summary.tool_matches++;
                }
            }

            // Check for MITRE matches
            let mitreIds = [];

            // Extract MITRE technique IDs from various fields
            if (artifact.mitre_technique_id_and_name) {
                const technique = artifact.mitre_technique_id_and_name;
                if (typeof technique === 'string') {
                    const match = technique.match(/^(T\d+\.?\d*)/);
                    if (match) {
                        mitreIds.push(match[1]);
                    }
                }
            }

            if (artifact.mitre_technique_id) {
                mitreIds.push(artifact.mitre_technique_id);
            }

            // Also check process names for common attack tools
            if (artifact.actor_process_image_name || artifact.process_name) {
                const processName = artifact.actor_process_image_name || artifact.process_name;
                console.log(`  🔎 Checking process for MITRE: ${processName}`);

                // Query MITRE techniques related to this process/tool
                const mitreProcessQuery = `
                    SELECT DISTINCT technique_id, technique_name, tactic, description, platform
                    FROM threat_intelligence.ti_mitre
                    WHERE description ILIKE $1 OR technique_name ILIKE $1
                `;
                const mitreProcessRes = await pgPool.query(mitreProcessQuery, [`%${processName}%`]);
                if (mitreProcessRes.rows.length > 0) {
                    matches.mitre.push(...mitreProcessRes.rows);
                    this.result.threat_intelligence_summary.mitre_matches = (this.result.threat_intelligence_summary.mitre_matches || 0) + mitreProcessRes.rows.length;
                    console.log(`  ✅ Found ${mitreProcessRes.rows.length} MITRE matches for process`);
                }
            }

            // Query specific MITRE technique IDs
            for (const mitreId of mitreIds) {
                if (mitreId && mitreId.trim()) {
                    console.log(`  🔎 Checking MITRE technique: ${mitreId}`);
                    const mitreQuery = `
                        SELECT technique_id, technique_name, tactic, description, platform
                        FROM threat_intelligence.ti_mitre
                        WHERE technique_id = $1
                    `;
                    const mitreRes = await pgPool.query(mitreQuery, [mitreId.trim()]);
                    console.log(`  📊 MITRE query result: ${mitreRes.rows.length} matches`);
                    if (mitreRes.rows.length > 0) {
                        matches.mitre.push(...mitreRes.rows);
                        this.result.threat_intelligence_summary.mitre_matches = (this.result.threat_intelligence_summary.mitre_matches || 0) + mitreRes.rows.length;
                        console.log(`  ✅ Found MITRE technique: ${mitreRes.rows[0].technique_name}`);
                    }
                }
            }

            // Update total matches
            const totalMatches = Object.values(matches).reduce((sum, arr) => sum + arr.length, 0);
            if (totalMatches > 0) {
                this.result.threat_intelligence_summary.total_matches++;
            }

        } catch (error) {
            console.error('❌ Error correlating threat intelligence:', error.message);
            if (error.code) {
                console.error(`  💥 PostgreSQL Error Code: ${error.code}`);
            }
            if (error.detail) {
                console.error(`  💥 PostgreSQL Error Detail: ${error.detail}`);
            }
        }

        return matches;
    }

    selectTopFiles(limit = 5) {
        return this.result.files
            .sort((a, b) => {
                // Priority 1: Files with threat intelligence matches
                const aMatches = Object.values(a.threat_intelligence_matches || {}).flat().length;
                const bMatches = Object.values(b.threat_intelligence_matches || {}).flat().length;
                if (aMatches !== bMatches) return bMatches - aMatches;

                // Priority 2: Files with SHA256 hash
                if (a.file_sha256 && !b.file_sha256) return -1;
                if (!a.file_sha256 && b.file_sha256) return 1;

                return 0;
            })
            .slice(0, limit)
            .map(f => ({
                file_name: f.action_file_name || f.file_name,
                file_path: f.action_file_path || f.file_path,
                file_sha256: f.file_sha256 || f.action_file_sha256,
                file_md5: f.file_md5 || f.action_file_md5,
                signer: f.action_file_authenticode_signer || f.file_signer,
                threat_matches: Object.keys(f.threat_intelligence_matches || {}).filter(k =>
                    (f.threat_intelligence_matches[k] || []).length > 0
                )
            }));
    }

    selectTopProcesses(limit = 5) {
        return this.result.processes
            .sort((a, b) => {
                const aMatches = Object.values(a.threat_intelligence_matches || {}).flat().length;
                const bMatches = Object.values(b.threat_intelligence_matches || {}).flat().length;
                return bMatches - aMatches;
            })
            .slice(0, limit)
            .map(p => ({
                process_name: p.actor_process_image_name || p.process_name,
                command_line: p.actor_process_command_line || p.command_line,
                process_sha256: p.actor_process_image_sha256 || p.process_sha256,
                user: p.actor_effective_username || p.user,
                threat_matches: Object.keys(p.threat_intelligence_matches || {}).filter(k =>
                    (p.threat_intelligence_matches[k] || []).length > 0
                )
            }));
    }

    selectTopNetworks(limit = 5) {
        return this.result.networks
            .sort((a, b) => {
                const aMatches = Object.values(a.threat_intelligence_matches || {}).flat().length;
                const bMatches = Object.values(b.threat_intelligence_matches || {}).flat().length;
                if (aMatches !== bMatches) return bMatches - aMatches;

                // Priority external IPs
                const aExternal = a.action_external_hostname || a.dst_ip;
                const bExternal = b.action_external_hostname || b.dst_ip;
                if (aExternal && !bExternal) return -1;
                if (!aExternal && bExternal) return 1;

                return 0;
            })
            .slice(0, limit)
            .map(n => ({
                remote_ip: n.action_remote_ip || n.dst_ip,
                remote_port: n.action_remote_port || n.dst_port,
                external_hostname: n.action_external_hostname,
                local_ip: n.action_local_ip || n.src_ip,
                local_port: n.action_local_port || n.src_port,
                threat_matches: Object.keys(n.threat_intelligence_matches || {}).filter(k =>
                    (n.threat_intelligence_matches[k] || []).length > 0
                )
            }));
    }

    calculateDuration() {
        if (!this.result.incident_info) return null;
        const created = this.result.incident_info.creation_time;
        const resolved = this.result.incident_info.resolved_timestamp;
        if (!created || !resolved) return null;
        return Math.round((resolved - created) / 1000 / 60); // minutes
    }

    generateSummary() {
        const info = this.result.incident_info || {};

        return {
            incident_summary: {
                incident_id: this.incidentId,
                status: info.status,
                severity: info.severity,
                description: info.description,
                creation_time: info.creation_time ? new Date(info.creation_time).toISOString() : null,
                resolved_time: info.resolved_timestamp ? new Date(info.resolved_timestamp).toISOString() : null,
                duration_minutes: this.calculateDuration(),
                assigned_to: info.assigned_user_pretty_name,
                resolve_comment: info.resolve_comment,
                hosts: info.hosts,
                users: info.users,
                xdr_url: info.xdr_url,
                tags: info.tags || []
            },
            endpoint_details: this.result.endpoints.map(ep => ({
                hostname: ep.endpoint_name,
                endpoint_id: ep.endpoint_id,
                os_info: {
                    operating_system: ep.operating_system,
                    os_version: ep.os_version,
                    endpoint_type: ep.endpoint_type
                },
                network_info: {
                    ip_addresses: ep.ip_addresses,
                    public_ip: ep.public_ip,
                    mac_addresses: ep.mac_addresses,
                    domain: ep.domain
                },
                security_status: {
                    operational_status: ep.operational_status,
                    endpoint_status: ep.endpoint_status,
                    is_isolated: ep.is_isolated,
                    scan_status: ep.scan_status,
                    content_status: ep.content_status
                },
                software_versions: {
                    endpoint_version: ep.endpoint_version,
                    content_version: ep.content_version,
                    last_content_update: ep.last_content_update_time
                },
                policies: {
                    prevention_policy: ep.assigned_prevention_policy,
                    extensions_policy: ep.assigned_extensions_policy
                },
                organization: {
                    groups: ep.group_name,
                    users: ep.users
                },
                timestamps: {
                    first_seen: ep.first_seen,
                    last_seen: ep.last_seen,
                    install_date: ep.install_date
                }
            })),
            mitre_attack: {
                tactics: info.mitre_tactics_ids_and_names || [],
                techniques: info.mitre_techniques_ids_and_names || [],
                technique_details: this.result.mitre_details.map(t => ({
                    technique_id: t.technique_id,
                    technique_name: t.technique_name,
                    tactic: t.tactic,
                    description: t.description?.substring(0, 200) + '...' // Truncate long descriptions
                }))
            },
            statistics: {
                alert_count: this.result.alerts.length,
                alert_severity: {
                    low: info.low_severity_alert_count || 0,
                    medium: info.med_severity_alert_count || 0,
                    high: info.high_severity_alert_count || 0,
                    critical: info.critical_severity_alert_count || 0
                },
                file_count: this.result.files.length,
                process_count: this.result.processes.length,
                network_count: this.result.networks.length,
                registry_count: this.result.registries.length,
                endpoint_count: this.result.endpoints.length,
                cve_count: this.result.cves ? this.result.cves.length : 0,
                cve_severity: {
                    critical: this.result.cves ? this.result.cves.filter(c => c.severity === 'CRITICAL' || c.severity_score >= 9).length : 0,
                    high: this.result.cves ? this.result.cves.filter(c => c.severity === 'HIGH' || (c.severity_score >= 7 && c.severity_score < 9)).length : 0,
                    medium: this.result.cves ? this.result.cves.filter(c => c.severity === 'MEDIUM' || (c.severity_score >= 4 && c.severity_score < 7)).length : 0,
                    low: this.result.cves ? this.result.cves.filter(c => c.severity === 'LOW' || c.severity_score < 4).length : 0
                },
                threat_intelligence: this.result.threat_intelligence_summary
            },
            top_artifacts: {
                critical_files: this.selectTopFiles(5),
                suspicious_processes: this.selectTopProcesses(5),
                network_connections: this.selectTopNetworks(5)
            },
            cve_vulnerabilities: {
                total_count: this.result.cves ? this.result.cves.length : 0,
                critical: this.result.cves ? this.result.cves.filter(c => c.severity === 'CRITICAL' || c.severity_score >= 9).map(c => ({
                    name: c.name,
                    score: c.severity_score,
                    description: c.description?.substring(0, 150) + '...',
                    affected_products: c.affected_products
                })) : [],
                high: this.result.cves ? this.result.cves.filter(c => c.severity === 'HIGH' || (c.severity_score >= 7 && c.severity_score < 9)).slice(0, 5).map(c => ({
                    name: c.name,
                    score: c.severity_score,
                    description: c.description?.substring(0, 150) + '...'
                })) : []
            },
            alert_categories: info.alert_categories || [],
            incident_sources: info.incident_sources || []
        };
    }

    outputResults(outputMode = 'summary') {
        console.log('\n📊 Analysis Complete!');
        console.log('='.repeat(50));
        console.log(`📋 Incident: ${this.result.incident_info?.description || 'Unknown'}`);
        console.log(`🎯 MITRE Techniques: ${this.result.mitre_details.length}`);
        console.log(`🚨 Alerts: ${this.result.alerts.length}`);
        console.log(`📁 Files: ${this.result.files.length}`);
        console.log(`🌐 Networks: ${this.result.networks.length}`);
        console.log(`⚙️  Processes: ${this.result.processes.length}`);
        console.log(`📝 Registries: ${this.result.registries.length}`);
        console.log(`💻 Endpoints: ${this.result.endpoints.length}`);
        console.log(`🔒 CVE Vulnerabilities: ${this.result.cves ? this.result.cves.length : 0}`);
        console.log(`🔍 Threat Intel Matches: ${this.result.threat_intelligence_summary.total_matches}`);
        console.log(`🎯 MITRE Matches: ${this.result.threat_intelligence_summary.mitre_matches}`);
        console.log('='.repeat(50));

        // Generate summary
        const summary = this.generateSummary();

        // Output based on mode
        if (outputMode === 'summary' || outputMode === 'both') {
            const summaryFile = `data/incidents/incident_${this.incidentId}_summary.json`;
            fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
            console.log(`\n💾 Summary saved to: ${summaryFile}`);
            console.log(`📊 Summary size: ${(JSON.stringify(summary).length / 1024).toFixed(2)} KB`);
        }

        if (outputMode === 'full' || outputMode === 'both') {
            const fullFile = `data/incidents/incident_${this.incidentId}_full.json`;
            fs.writeFileSync(fullFile, JSON.stringify(this.result, null, 2));
            console.log(`💾 Full report saved to: ${fullFile}`);
            console.log(`📊 Full size: ${(JSON.stringify(this.result).length / 1024).toFixed(2)} KB`);
        }

        // Always output summary to console for quick review
        console.log('\n📄 Summary Report:');
        console.log(JSON.stringify(summary, null, 2));
    }
}

// Main execution
async function main() {
    const incidentId = process.argv[2];
    const args = process.argv.slice(2);

    if (!incidentId) {
        console.error('❌ Usage: node info.js <incident_id> [--summary|--full|--both]');
        console.error('📝 Examples:');
        console.error('   node info.js 414078              # Generate summary only (default)');
        console.error('   node info.js 414078 --summary    # Generate summary only (explicit)');
        console.error('   node info.js 414078 --full       # Generate full analysis only');
        console.error('   node info.js 414078 --both       # Generate both summary and full');
        process.exit(1);
    }

    // Parse output mode from CLI arguments
    let outputMode = 'summary'; // default
    if (args.includes('--full')) {
        outputMode = 'full';
    } else if (args.includes('--both')) {
        outputMode = 'both';
    } else if (args.includes('--summary')) {
        outputMode = 'summary';
    }

    console.log('🚀 Starting Incident Analysis...');
    console.log(`🔢 Incident ID: ${incidentId}`);
    console.log(`📄 Output mode: ${outputMode}`);

    // Test PostgreSQL connection
    try {
        console.log('🔌 Testing PostgreSQL connection...');
        const testResult = await pgPool.query('SELECT NOW() as current_time');
        console.log(`✅ PostgreSQL connected: ${testResult.rows[0].current_time}`);

        // Test threat_intelligence schema
        const schemaTest = await pgPool.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'threat_intelligence'
            LIMIT 5
        `);
        console.log(`✅ Found ${schemaTest.rows.length} threat intelligence tables`);

    } catch (error) {
        console.error('❌ PostgreSQL connection failed:', error.message);
        console.error('⚠️  Threat intelligence matching will be disabled');
    }

    const analyzer = new IncidentAnalyzer(incidentId);
    await analyzer.analyzeIncident(outputMode);
}

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

if (require.main === module) {
    main();
}

module.exports = IncidentAnalyzer;