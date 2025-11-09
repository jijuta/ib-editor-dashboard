#!/usr/bin/env npx tsx

/**
 * Test TI Correlator
 */

import { checkHashesInTI, checkIPsInTI, getMITREByIncident } from '../script/ti-correlator.js';

async function main() {
  console.log('🧪 Testing TI Correlator...\n');

  // Test 1: Check sample hash
  console.log('Test 1: File Hash TI Check');
  const testHashes = [
    'c3ab8ff13720e8ad9047dd39466b3c8974e592c2fa383d4a3960714caef0c4f2', // Sample SHA256
  ];

  try {
    const hashResults = await checkHashesInTI(testHashes);
    console.log('✅ Hash check result:');
    console.log(JSON.stringify(hashResults, null, 2));
  } catch (error) {
    console.error('❌ Hash check error:', error);
  }

  console.log('\n---\n');

  // Test 2: Check sample IP
  console.log('Test 2: IP Address TI Check');
  const testIPs = [
    '8.8.8.8', // Sample IP
  ];

  try {
    const ipResults = await checkIPsInTI(testIPs);
    console.log('✅ IP check result:');
    console.log(JSON.stringify(ipResults, null, 2));
  } catch (error) {
    console.error('❌ IP check error:', error);
  }

  console.log('\n---\n');

  // Test 3: MITRE lookup
  console.log('Test 3: MITRE ATT&CK Lookup');
  const testIncidentId = '414186'; // Use actual incident ID

  try {
    const mitreResults = await getMITREByIncident(testIncidentId);
    console.log(`✅ MITRE techniques found: ${mitreResults.length}`);
    if (mitreResults.length > 0) {
      console.log(JSON.stringify(mitreResults[0], null, 2));
    }
  } catch (error) {
    console.error('❌ MITRE lookup error:', error);
  }

  console.log('\n✅ TI Correlator test complete!');
}

main().catch(console.error);
