// React에서 수동으로 호출할 수 있도록 전역 함수로 변경
window.initDashboard = function() {
    // 초기 플로우 상태 확인 및 설정
    const currentInfo = document.getElementById('currentProcessingIncident');
    const flowContent = document.getElementById('flowContent');
    
    // 플로우 표시 상태를 체크하는 함수
    function checkFlowVisibility() {
        const automationFlow = document.getElementById('automationFlow');
        if (currentInfo && automationFlow) {
            const isWaiting = currentInfo.textContent.trim() === '처리 대기중...';
            if (isWaiting) {
                // 전체 플로우 영역을 아래로 숨김
                automationFlow.classList.remove('show');
            }
        }
    }
    
    // 초기 상태 체크
    checkFlowVisibility();
    
    // 텍스트 변경 감지하여 자동으로 플로우 표시/숨김 제어
    if (currentInfo) {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList' || mutation.type === 'characterData') {
                    checkFlowVisibility();
                }
            });
        });
        
        observer.observe(currentInfo, {
            childList: true,
            characterData: true,
            subtree: true
        });
    }

    // KPI 카드 순차 애니메이션
    const kpiCards = document.querySelectorAll('.kpi-card');
    kpiCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'scale(0.5)';
        setTimeout(() => {
            card.style.transition = 'all 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
            card.style.opacity = '1';
            card.style.transform = 'scale(1)';
        }, 100 + index * 100);
    });

    // 패널 카드 슬라이드 인
    const leftCards = document.querySelectorAll('.side-panel:first-child .panel-card');
    const rightCards = document.querySelectorAll('.side-panel:last-child .panel-card');

    leftCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateX(-50px)';
        setTimeout(() => {
            card.style.transition = 'all 0.8s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateX(0)';
        }, 300 + index * 100);
    });

    rightCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateX(50px)';
        setTimeout(() => {
            card.style.transition = 'all 0.8s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateX(0)';
        }, 300 + index * 100);
    });

    // 하단 3개 카드 애니메이션
    const bottomCards = document.querySelectorAll('.bottom-section .report-card');
    bottomCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        setTimeout(() => {
            card.style.transition = 'all 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, 1200 + index * 150);
    });

    // 초기 숫자 카운팅 애니메이션 (페이지 로드 시 1회만 실행)
    const kpiValues = document.querySelectorAll('.kpi-value');
    const initialAnimationIntervals = [];
    
    kpiValues.forEach((value, index) => {
        const finalValue = value.innerText;
        const isPercentage = finalValue.includes('%');
        const numericValue = parseInt(finalValue.replace(/[^0-9]/g, ''));
        let currentValue = 0;
        const increment = numericValue / 60;

        const counter = setInterval(() => {
            currentValue += increment;
            if (currentValue >= numericValue) {
                currentValue = numericValue;
                clearInterval(counter);
                value.innerText = finalValue;
            } else {
                value.innerText = isPercentage ?
                    Math.floor(currentValue) + '%' :
                    Math.floor(currentValue).toLocaleString();
            }
        }, 20);
        
        // 인터벌 ID 저장 (나중에 정리용)
        initialAnimationIntervals.push(counter);
    });

    // 막대 차트 애니메이션
    const bars = document.querySelectorAll('.bar');
    bars.forEach((bar, index) => {
        const originalHeight = bar.style.height;
        bar.style.height = '0%';
        setTimeout(() => {
            bar.style.transition = 'height 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
            bar.style.height = originalHeight;
        }, 800 + index * 30);
    });

    // SVG 원형 차트 애니메이션
    const circles = document.querySelectorAll('svg circle[stroke-dasharray]');
    circles.forEach((circle, index) => {
        const dashArray = circle.getAttribute('stroke-dasharray');
        const dashOffset = circle.getAttribute('stroke-dashoffset');
        circle.setAttribute('stroke-dashoffset', dashArray);
        setTimeout(() => {
            circle.style.transition = 'stroke-dashoffset 1.5s ease-out';
            circle.setAttribute('stroke-dashoffset', dashOffset);
        }, 1000 + index * 200);
    });

    // Enter 버튼 펄스
    const enterBtn = document.querySelector('.enter-button');
    if (enterBtn) {
        setInterval(() => {
            enterBtn.style.boxShadow = '0 5px 30px rgba(0, 212, 255, 0.8)';
            setTimeout(() => {
                enterBtn.style.boxShadow = '0 5px 20px rgba(0, 212, 255, 0.4)';
            }, 1000);
        }, 2000);
    }

    // 중앙 텍스트와 KPI 카드 동기화 시스템
    const centerText = document.querySelector('.center-text');
    
    // KPI 카드와 매핑되는 상세 정보
    const kpiCardInfo = [
        { 
            text: '엔드포인트 분석중', 
            description: '활성 엔드포인트 4,380개 보호 중', 
            threatMessage: '엔드포인트 보안 상태 및 업데이트 분석 진행중...',
            targetValue: 4380, 
            unit: '' 
        },
        { 
            text: '탐지율 분석중', 
            description: '위협 탐지율 97.8% 달성', 
            threatMessage: 'AI 기반 위협 탐지 알고리즘 분석중...',
            targetValue: 97.8, 
            unit: '%' 
        },
        { 
            text: '위협차단 분석중', 
            description: '총 147개 위협 실시간 차단', 
            threatMessage: '악성코드 및 램웨어 차단 상태 분석중...',
            targetValue: 147, 
            unit: '' 
        },
        { 
            text: '차단성공률 분석중', 
            description: '94.2% 차단 성공률 유지', 
            threatMessage: '다단계 보안 정책 효과성 분석중...',
            targetValue: 94.2, 
            unit: '%' 
        },
        { 
            text: 'CVE관리 분석중', 
            description: '89개 중요 CVE 모니터링', 
            threatMessage: '중요 취약점 및 패치 상태 분석중...',
            targetValue: 89, 
            unit: '' 
        },
        { 
            text: 'MTTR 분석중', 
            description: '평균 대응시간 27분 단축', 
            threatMessage: '인시던트 대응 속도 및 효율성 분석중...',
            targetValue: 27, 
            unit: '분' 
        },
        { 
            text: '에이전트 분석중', 
            description: '98.7% 에이전트 정상 운영', 
            threatMessage: 'XDR 에이전트 상태 및 성능 분석중...',
            targetValue: 98.7, 
            unit: '%' 
        },
        { 
            text: '인시던트 분석중', 
            description: '8개 인시던트 처리 진행 중', 
            threatMessage: '활성 보안 인시던트 우선순위 분석중...',
            targetValue: 8, 
            unit: '' 
        }
    ];
    
    let currentCardIndex = 0;
    let rotationActive = false;
    let progressInterval;
    let progressValue = 0;
    
    // 프로그래스 바와 카운터 생성 함수
    function createProgressBarWithCounter(targetValue, unit) {
        // 기존 래퍼 제거
        const existingWrapper = document.querySelector('.analysis-wrapper');
        if (existingWrapper) existingWrapper.remove();
        
        // 프로그레스 바 생성 (중앙 텍스트 바로 밑)
        const progressContainer = document.createElement('div');
        progressContainer.className = 'analysis-progress';
        progressContainer.style.cssText = `
            width: 200px;
            height: 4px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 2px;
            overflow: hidden;
            margin-top: 8px;
        `;
        
        // 카운터 숫자 표시 영역 생성 (프로그래스 바 밑)
        const counterElement = document.createElement('div');
        counterElement.className = 'analysis-counter';
        counterElement.style.cssText = `
            color: #00d4ff;
            font-size: 14px;
            font-weight: 600;
            text-align: center;
            text-shadow: 0 0 10px rgba(0, 212, 255, 0.5);
        `;
        counterElement.textContent = `0${unit}`;
        
        const progressBar = document.createElement('div');
        progressBar.className = 'progress-bar';
        progressBar.style.cssText = `
            width: 0%;
            height: 100%;
            background: linear-gradient(90deg, #00d4ff, #4a9eff);
            border-radius: 2px;
            transition: width 0.1s ease;
            box-shadow: 0 0 10px rgba(0, 212, 255, 0.5);
        `;
        
        progressContainer.appendChild(progressBar);
        
        // 래퍼 div로 세로 배치
        const analysisWrapper = document.createElement('div');
        analysisWrapper.className = 'analysis-wrapper';
        analysisWrapper.style.cssText = `
            position: relative;
            top: -60px;
            left: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            z-index: 10;
            margin-bottom: -40px;
        `;
        
        // 구조 조립 (숫자 먼저, 프로그레스바 나중)
        analysisWrapper.appendChild(counterElement);
        analysisWrapper.appendChild(progressContainer);
        
        // center-text에 래퍼 추가
        centerText.parentElement.appendChild(analysisWrapper);
        
        return { progressBar, counterElement };
    }
    
    function updateProgressWithCounter(progressBar, counterElement, targetValue, unit, duration) {
        progressValue = 0;
        let currentCounter = 0;
        const progressIncrement = 100 / (duration / 100); // 100ms마다 업데이트
        const counterIncrement = targetValue / (duration / 100);
        
        progressInterval = setInterval(() => {
            progressValue += progressIncrement;
            currentCounter += counterIncrement;
            
            if (progressValue >= 100) {
                progressValue = 100;
                currentCounter = targetValue;
                clearInterval(progressInterval);
            }
            
            // 프로그레스 바 업데이트
            progressBar.style.width = progressValue + '%';
            
            // 카운터 숫자 업데이트
            let displayValue;
            if (unit === '%') {
                displayValue = currentCounter.toFixed(1);
            } else if (unit === '분') {
                displayValue = Math.floor(currentCounter);
            } else {
                displayValue = Math.floor(currentCounter).toLocaleString();
            }
            counterElement.textContent = `${displayValue}${unit}`;
        }, 100);
    }
    
    function startSynchronizedRotation() {
        if (rotationActive) return;
        rotationActive = true;
        
        function showNextCard() {
            // 모든 카드 효과 제거
            kpiCards.forEach(card => {
                card.classList.remove('focused', 'spotlight');
            });
            
            const cardInfo = kpiCardInfo[currentCardIndex];
            const currentCard = kpiCards[currentCardIndex];
            
            // 단계 1: 카드 포커싱 (0-1초)
            currentCard.classList.add('spotlight');
            
            // 단계 2: 분석 메시지 표시 (1-3초)
            setTimeout(() => {
                centerText.style.opacity = '0';
                setTimeout(() => {
                    centerText.textContent = cardInfo.text;
                    centerText.style.opacity = '1';
                }, 300);
            }, 1000);
            
            // 단계 3: 위협요소 처리 메시지 표시 (3-5초)
            setTimeout(() => {
                createToast('warning', '위협 분석', cardInfo.threatMessage);
            }, 3000);
            
            // 단계 4: 프로그레스바 시작 및 숫자 카운팅 (5-13초)
            setTimeout(() => {
                const { progressBar, counterElement } = createProgressBarWithCounter(cardInfo.targetValue, cardInfo.unit);
                updateProgressWithCounter(progressBar, counterElement, cardInfo.targetValue, cardInfo.unit, 8000); // 8초 동안 진행
                
                // 단계 5: 분석 완료 메시지 (10초 후)
                setTimeout(() => {
                    createToast('success', '분석 완료', cardInfo.description);
                }, 5000);
                
                // 프로그레스바 완료 후 스포트라이트 효과 제거 (8초 후)
                setTimeout(() => {
                    currentCard.classList.remove('spotlight');
                    
                    // 프로그레스 바 래퍼 제거
                    setTimeout(() => {
                        const wrapperElement = document.querySelector('.analysis-wrapper');
                        if (wrapperElement) wrapperElement.remove();
                        clearInterval(progressInterval);
                    }, 500);
                }, 8000); // 프로그레스바 완료 시점
                
            }, 5000);
            
            // 단계 6: 다음 카드로 이동 (15초 후)
            setTimeout(() => {
                currentCardIndex = (currentCardIndex + 1) % kpiCards.length;
                
                if (currentCardIndex === 0) {
                    // 한 바퀴 완료 시 DefenderXAI로 복원 후 10초 대기
                    setTimeout(() => {
                        centerText.style.opacity = '0';
                        setTimeout(() => {
                            centerText.textContent = 'DeFender X';
                            centerText.style.opacity = '1';
                        }, 300);
                    }, 500);
                    
                    rotationActive = false;
                    setTimeout(() => {
                        startSynchronizedRotation();
                    }, 10000); // 10초 대기
                } else {
                    showNextCard();
                }
            }, 15000); // 각 카드당 15초
        }
        
        showNextCard();
    }

    // 중앙 텍스트 glow 효과
    setInterval(() => {
        centerText.style.textShadow = '0 0 30px rgba(0, 212, 255, 1), 0 0 60px rgba(0, 212, 255, 0.8)';
        setTimeout(() => {
            centerText.style.textShadow = '0 0 20px rgba(0, 212, 255, 0.8), 0 0 40px rgba(0, 212, 255, 0.4)';
        }, 1500);
    }, 3000);

    // KPI 데이터 시스템
    let currentFocusIndex = 0;
    let refreshCounter = 5;
    
    // 애니메이션 인터벌 관리를 위한 전역 객체
    const kpiAnimationIntervals = {};

    const kpiData = {
        endpoints: { values: [4380, 4395, 4367, 4401, 4389, 4412], changes: ['+2.1%', '+2.8%', '+1.5%', '+3.2%', '+2.3%', '+3.7%'] },
        detection: { values: [97.8, 98.1, 97.5, 98.4, 97.9, 98.2], changes: ['+1.2%', '+1.8%', '+0.8%', '+2.1%', '+1.4%', '+1.9%'] },
        threats: { values: [147, 132, 163, 128, 154, 139], changes: ['-15.3%', '-25.8%', '-8.2%', '-28.4%', '-12.7%', '-19.6%'] },
        block: { values: [94.2, 95.1, 93.8, 95.7, 94.5, 96.2], changes: ['+3.1%', '+4.8%', '+2.2%', '+5.9%', '+3.7%', '+6.4%'] },
        cve: { values: [89, 97, 83, 105, 92, 78], changes: ['+12.7%', '+24.3%', '+5.8%', '+34.6%', '+15.2%', '+2.4%'] },
        mttr: { values: [27, 24, 31, 22, 29, 19], changes: ['-18.5%', '-25.6%', '-11.4%', '-31.3%', '-15.8%', '-36.7%'] },
        health: { values: [98.7, 98.9, 98.4, 99.1, 98.6, 99.3], changes: ['+0.8%', '+1.2%', '+0.5%', '+1.6%', '+0.7%', '+1.9%'] },
        incidents: { values: [8, 5, 12, 4, 9, 6], changes: ['-33.3%', '-58.3%', '-16.7%', '-66.7%', '-25.0%', '-50.0%'] }
    };

    // 헤더 통계 데이터
    const headerStatsData = {
        threats: { values: [147, 132, 163, 128, 154, 139, 175, 119, 188, 144] },
        incidents: { values: [23, 18, 31, 15, 27, 19, 35, 12, 29, 21] },
        alerts: { values: [285, 267, 312, 245, 298, 273, 329, 239, 315, 281] },
        artifacts: { values: [1247, 1198, 1289, 1156, 1278, 1234, 1345, 1123, 1367, 1205] },
        mitre: { values: [15, 12, 18, 11, 16, 13, 19, 10, 17, 14] },
        endpoints: { values: [4380, 4395, 4367, 4401, 4389, 4412, 4356, 4423, 4372, 4398] },
        'critical-cves': { values: [89, 97, 83, 105, 92, 78, 111, 74, 103, 86] }
    };

    function getRandomKpiValue(kpiType) {
        const data = kpiData[kpiType];
        const randomIndex = Math.floor(Math.random() * data.values.length);
        return {
            value: data.values[randomIndex],
            change: data.changes[randomIndex]
        };
    }

    // 헤더 통계 업데이트 함수
    function getRandomHeaderValue(statType) {
        const data = headerStatsData[statType];
        const randomIndex = Math.floor(Math.random() * data.values.length);
        return data.values[randomIndex];
    }

    function updateHeaderStats() {
        const headerStats = document.querySelectorAll('.header-stats .stat-number');
        
        headerStats.forEach(statElement => {
            const className = Array.from(statElement.classList).find(cls => cls !== 'stat-number');
            if (className && headerStatsData[className]) {
                const currentValue = parseInt(statElement.textContent.replace(/,/g, ''));
                const newValue = getRandomHeaderValue(className);
                
                // 숫자 카운팅 애니메이션
                animateNumber(statElement, currentValue, newValue);
            }
        });
    }

    function animateNumber(element, startValue, endValue) {
        const duration = 1500; // 1.5초
        const startTime = performance.now();
        const isLargeNumber = endValue > 1000;
        
        function updateNumber(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const currentValue = startValue + (endValue - startValue) * progress;
            
            if (isLargeNumber) {
                element.textContent = Math.floor(currentValue).toLocaleString();
            } else {
                element.textContent = Math.floor(currentValue);
            }
            
            if (progress < 1) {
                requestAnimationFrame(updateNumber);
            }
        }
        
        requestAnimationFrame(updateNumber);
    }

    function updateKpiData() {
        kpiCards.forEach(card => {
            const kpiType = card.getAttribute('data-kpi');
            const valueElement = card.querySelector('.kpi-value');
            const changeElement = card.querySelector('.kpi-change span');
            const changeContainer = card.querySelector('.kpi-change');

            const newData = getRandomKpiValue(kpiType);

            // 숫자 카운팅 애니메이션
            const currentText = valueElement.textContent;
            const currentValue = parseFloat(currentText.replace(/[^0-9.]/g, ''));
            const targetValue = newData.value;
            const isPercentage = currentText.includes('%');
            const hasMinutes = currentText.includes('분');

            let counter = currentValue;
            const increment = (targetValue - currentValue) / 30;

            // 이전 애니메이션이 있으면 중지
            if (kpiAnimationIntervals[kpiType]) {
                clearInterval(kpiAnimationIntervals[kpiType]);
                delete kpiAnimationIntervals[kpiType];
            }
            
            // 새 애니메이션 시작
            kpiAnimationIntervals[kpiType] = setInterval(() => {
                counter += increment;
                if ((increment > 0 && counter >= targetValue) || (increment < 0 && counter <= targetValue)) {
                    counter = targetValue;
                    clearInterval(kpiAnimationIntervals[kpiType]);
                    delete kpiAnimationIntervals[kpiType];
                }

                if (hasMinutes) {
                    valueElement.textContent = Math.floor(counter) + '분';
                } else if (isPercentage) {
                    valueElement.textContent = counter.toFixed(1) + '%';
                } else {
                    valueElement.textContent = Math.floor(counter).toLocaleString();
                }
            }, 50);

            // 변화율 업데이트
            changeElement.textContent = newData.change;

            // 색상 변경
            changeContainer.className = 'kpi-change ';
            if (newData.change.startsWith('+')) {
                changeContainer.classList.add('positive');
            } else if (newData.change.startsWith('-')) {
                changeContainer.classList.add('negative');
            } else {
                changeContainer.classList.add('neutral');
            }
        });
    }

    // 랜덤 포커스 기능 (동기화 로테이션과 충돌 방지)
    function focusRandomCard() {
        // 동기화된 로테이션이 활성될 때는 랜덤 포커스 비활성화
        if (rotationActive) return;
        
        kpiCards.forEach(card => {
            card.classList.remove('focused', 'spotlight');
        });
        const randomIndex = Math.floor(Math.random() * kpiCards.length);
        kpiCards[randomIndex].classList.add('focused');
    }

    function updateTimer() {
        const timerText = document.getElementById('timerText');
        timerText.textContent = refreshCounter + 's';
        refreshCounter--;

        if (refreshCounter < 0) {
            refreshCounter = 5;
            updateKpiData();
            updateHeaderStats(); // 헤더 통계도 함께 업데이트
            // 동기화된 로테이션이 비활성화일 때만 랜덤 포커스 실행
            if (!rotationActive) {
                focusRandomCard();
            }
        }
    }

    // 토스트 알림 시스템
    const toastMessages = [
        { type: 'info', title: 'XDR 데이터 동기화', message: 'SecureX XDR 에이전트 데이터가 성공적으로 동기화되었습니다.' },
        { type: 'success', title: '위협 차단 성공', message: '악성 프로세스 실행이 성공적으로 차단되었습니다.' },
        { type: 'warning', title: '중요 CVE 탐지', message: '89개 엔드포인트에서 CRITICAL CVE가 탐지되었습니다.' },
        { type: 'error', title: 'MDR 알림', message: '고위험 인시던트가 MDR 팀에게 할당되었습니다.' },
        { type: 'info', title: 'AI 분석 완료', message: '주간 위협 패턴 AI 분석이 완료되었습니다.' },
        { type: 'success', title: 'MITRE 매핑 업데이트', message: '147개 위협에 대한 MITRE ATT&CK 매핑이 완료되었습니다.' },
        { type: 'warning', title: '엔드포인트 연결 문제', message: '25개 엔드포인트에서 일시적 연결 문제가 발생했습니다.' }
    ];

    function showRandomToast() {
        const randomToast = toastMessages[Math.floor(Math.random() * toastMessages.length)];
        createToast(randomToast.type, randomToast.title, randomToast.message);
    }

    function createToast(type, title, message) {
        const toastContainer = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const iconMap = {
            info: 'fas fa-info-circle',
            success: 'fas fa-check-circle',
            warning: 'fas fa-exclamation-triangle',
            error: 'fas fa-times-circle'
        };

        const colorMap = {
            info: '#00d4ff',
            success: '#00ff88',
            warning: '#feca57',
            error: '#ff6b9d'
        };

        toast.innerHTML = `
                    <div class="toast-header">
                        <i class="toast-icon ${iconMap[type]}" style="color: ${colorMap[type]}"></i>
                        <span class="toast-title" style="color: ${colorMap[type]}">${title}</span>
                    </div>
                    <div class="toast-message">${message}</div>
                `;

        toastContainer.appendChild(toast);

        // 사라지게 하기
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

    // 타이머 시작
    setInterval(updateTimer, 1000);

    // 초기 포커스 및 데이터 로드
    setTimeout(() => {
        focusRandomCard();
        updateKpiData();
        updateHeaderStats(); // 초기 헤더 통계 업데이트
        
        // 초기 테스트 토스트
        createToast('success', '시스템 초기화', 'Defender X 대시보드가 정상적으로 로드되었습니다.');
        
        // 5초 후 동기화된 로테이션 시작
        setTimeout(() => {
            startSynchronizedRotation();
        }, 5000);
    }, 2000);

    // 좌측 우측 패널 자동 스크롤 로테이션
    function startPanelRotation() {
        const leftPanel = document.querySelector('.side-panel:first-child');
        const rightPanel = document.querySelector('.side-panel:last-child');
        
        if (!leftPanel || !rightPanel) return;
        
        let leftScrollPosition = 0;
        let rightScrollPosition = 0;
        const scrollAmount = 200; // 스크롤 양
        const rotationInterval = 8000; // 8초마다 스크롤
        
        function animatePanel(panel, targetScroll) {
            panel.style.scrollBehavior = 'smooth';
            panel.scrollTop = targetScroll;
        }
        
        function rotatePanels() {
            // 좌측 패널 스크롤
            const leftMaxScroll = leftPanel.scrollHeight - leftPanel.clientHeight;
            leftScrollPosition += scrollAmount;
            
            if (leftScrollPosition >= leftMaxScroll) {
                leftScrollPosition = 0; // 맨 위로 리셋
            }
            
            // 우측 패널 스크롤 (좌측과 다른 패턴)
            const rightMaxScroll = rightPanel.scrollHeight - rightPanel.clientHeight;
            rightScrollPosition += scrollAmount * 1.2; // 약간 다른 속도
            
            if (rightScrollPosition >= rightMaxScroll) {
                rightScrollPosition = 0; // 맨 위로 리셋
            }
            
            // 애니메이션 적용
            animatePanel(leftPanel, leftScrollPosition);
            setTimeout(() => {
                animatePanel(rightPanel, rightScrollPosition);
            }, 1000); // 1초 차이로 스크롤
        }
        
        // 초기 지연 후 시작
        setTimeout(() => {
            setInterval(rotatePanels, rotationInterval);
        }, 10000); // 10초 후 패널 로테이션 시작
    }
    
    // 패널 로테이션 시작
    startPanelRotation();
});

// 해시 복사 기능
function copyHash(hash) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(hash).then(() => {
            createToast('success', '복사 완료', `해시값이 클립보드에 복사되었습니다: ${hash.substring(0, 16)}...`);
        }).catch(err => {
            console.error('복사 실패:', err);
            fallbackCopyHash(hash);
        });
    } else {
        fallbackCopyHash(hash);
    }
}

// 클립보드 API를 지원하지 않는 브라우저용 대체 복사 기능
function fallbackCopyHash(hash) {
    const textArea = document.createElement('textarea');
    textArea.value = hash;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        document.execCommand('copy');
        createToast('success', '복사 완료', `해시값이 클립보드에 복사되었습니다: ${hash.substring(0, 16)}...`);
    } catch (err) {
        console.error('복사 실패:', err);
        createToast('error', '복사 실패', '해시값을 복사할 수 없습니다.');
    }
    
    document.body.removeChild(textArea);
}

// VirusTotal에서 해시 검색
function openVirusTotal(hash) {
    const vtUrl = `https://www.virustotal.com/gui/file/${hash}`;
    window.open(vtUrl, '_blank', 'noopener,noreferrer');
    createToast('info', 'VirusTotal 열기', `해시 ${hash.substring(0, 16)}...을(를) VirusTotal에서 검색합니다.`);
}

// ================================
// 토스트 알림 시스템
// ================================

function createToast(type, title, message) {
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const iconMap = {
        info: 'fas fa-info-circle',
        success: 'fas fa-check-circle',
        warning: 'fas fa-exclamation-triangle',
        error: 'fas fa-times-circle',
        critical: 'fas fa-fire'
    };

    const colorMap = {
        info: '#00d4ff',
        success: '#00ff88',
        warning: '#feca57',
        error: '#ff6b9d',
        critical: '#ff4336',
        high: '#ff9800',
        medium: '#ffc107',
        low: '#4caf50'
    };

    const displayColor = colorMap[type] || '#00d4ff';

    toast.innerHTML = `
        <div class="toast-header">
            <i class="toast-icon ${iconMap[type] || iconMap.info}" style="color: ${displayColor}"></i>
            <span class="toast-title" style="color: ${displayColor}">${title}</span>
        </div>
        <div class="toast-message">${message}</div>
    `;

    toastContainer.appendChild(toast);

    // 사라지게 하기
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// ================================
// 자동 처리 플로우 시스템
// ================================

let automationFlowActive = false;
let automationFlowTimer = null;
let automationStepTimer = null;
let currentFlowStep = 0;
let currentScenario = null;
const FLOW_DURATION = 12000; // 12초 동안 표시
const STEP_DURATION = 2000; // 각 스텝은 2초씩

// 보안 시나리오 정의
const securityScenarios = [
    {
        id: 'malware_detection',
        icon: '<i class="fas fa-virus"></i>',
        title: '악성코드 탐지',
        description: '랜섬웨어 변종을 실시간으로 차단 중',
        severity: 'critical',
        color: '#ff4336'
    },
    {
        id: 'phishing_attack',
        icon: '<i class="fas fa-fish"></i>',
        title: '피싱 공격 차단',
        description: '의심스러운 이메일 링크를 자동 차단',
        severity: 'high',
        color: '#ff9800'
    },
    {
        id: 'lateral_movement',
        icon: '<i class="fas fa-network-wired"></i>',
        title: '횡적 이동 탐지',
        description: '내부 네트워크 스캔 활동을 탐지',
        severity: 'high',
        color: '#ff9800'
    },
    {
        id: 'data_exfiltration',
        icon: '<i class="fas fa-upload"></i>',
        title: '데이터 유출 차단',
        description: '대용량 파일 외부 전송을 차단',
        severity: 'critical',
        color: '#ff4336'
    },
    {
        id: 'privilege_escalation',
        icon: '<i class="fas fa-user-shield"></i>',
        title: '권한 상승 시도',
        description: '관리자 권한 탈취 시도를 탐지',
        severity: 'high',
        color: '#ff9800'
    },
    {
        id: 'suspicious_process',
        icon: '<i class="fas fa-cog"></i>',
        title: '의심 프로세스 분석',
        description: '알 수 없는 프로세스 실행을 분석',
        severity: 'medium',
        color: '#ffc107'
    },
    {
        id: 'network_anomaly',
        icon: '<i class="fas fa-exclamation-triangle"></i>',
        title: '네트워크 이상 탐지',
        description: '비정상적인 트래픽 패턴을 분석',
        severity: 'medium',
        color: '#ffc107'
    },
    {
        id: 'endpoint_isolation',
        icon: '<i class="fas fa-shield-alt"></i>',
        title: '엔드포인트 격리',
        description: '감염된 시스템을 네트워크에서 격리',
        severity: 'critical',
        color: '#ff4336'
    }
];

const flowSteps = [
    { id: 'step1', duration: 2000, action: () => console.log('위협 탐지 완료') },
    { id: 'step2', duration: 2000, action: () => console.log('N8n 데이터 수집 완료') },
    { id: 'step3', duration: 2000, action: () => console.log('OpenSearch 인덱싱 완료') },
    { id: 'step4', duration: 2000, action: () => console.log('위협 분석 완료') },
    { id: 'step5', duration: 1000, action: () => console.log('TheHive 알림 생성 완료') },
    { id: 'step6', duration: 1000, action: () => {
        console.log('자동 차단 완료');
        completeAutomationFlow();
    }}
];

// 랜덤 시나리오 선택
function selectRandomScenario() {
    return securityScenarios[Math.floor(Math.random() * securityScenarios.length)];
}

// 플로우 UI 업데이트
function updateFlowUI(scenario) {
    // 메인 타이틀 업데이트
    const mainTitleIcon = document.querySelector('.flow-main-title span:first-child');
    const mainTitleText = document.querySelector('.flow-main-title span:last-child');
    
    if (mainTitleIcon && mainTitleText) {
        mainTitleIcon.innerHTML = scenario.icon;
        mainTitleText.textContent = scenario.title;
        
        // 심각도별 색상 적용
        const flowTitle = document.querySelector('.flow-main-title');
        if (flowTitle) {
            flowTitle.style.color = scenario.color;
            flowTitle.style.textShadow = `0 0 10px ${scenario.color}50`;
        }
    }
    
    // 현재 처리 정보 업데이트
    const currentInfo = document.getElementById('currentProcessingIncident');
    if (currentInfo) {
        currentInfo.textContent = scenario.description;
        currentInfo.style.color = scenario.color;
    }
}

// 자동 처리 플로우 시작
function startAutomationFlow() {
    if (automationFlowActive) return;
    
    automationFlowActive = true;
    currentFlowStep = 0;
    
    // 랜덤 시나리오 선택
    currentScenario = selectRandomScenario();
    
    const flowElement = document.getElementById('automationFlow');
    if (!flowElement) return;
    
    // 플로우 표시
    flowElement.classList.add('show');
    
    // 플로우 콘텐츠 표시 (이제 항상 표시됨)
    const flowContent = document.getElementById('flowContent');
    if (flowContent) {
        flowContent.classList.remove('hidden');
        flowContent.classList.add('visible');
    }
    
    // 모든 스텝 초기화
    resetAllSteps();
    
    // 시나리오에 따른 UI 업데이트
    updateFlowUI(currentScenario);
    
    // 프로그레스바 초기화
    const progressBar = document.getElementById('flowProgressBar');
    if (progressBar) {
        progressBar.style.width = '0%';
        progressBar.style.background = `linear-gradient(90deg, ${currentScenario.color}, ${currentScenario.color}80)`;
    }
    
    // 원형 타이머 시작
    startCircularProgress();
    
    // 스텝 처리 시작
    processSteps(flowSteps, 0);
    
    // 시나리오별 토스트 알림
    const severityEmoji = {
        'critical': '🔥',
        'high': '⚠️', 
        'medium': '⚡',
        'low': 'ℹ️'
    };
    
    createToast(currentScenario.severity, 
        `${severityEmoji[currentScenario.severity]} ${currentScenario.title}`, 
        `${currentScenario.description} - 자동 대응을 시작합니다.`);
}

// 원형 프로그레스바 시작 (10초)
function startCircularProgress() {
    const timerText = document.querySelector('.timer-text');
    const timerCircle = document.querySelector('.timer-circle');
    
    if (!timerText || !timerCircle) return;
    
    let timeLeft = 10;
    timerText.textContent = timeLeft;
    
    automationFlowTimer = setInterval(() => {
        timeLeft--;
        timerText.textContent = timeLeft;
        
        // 원형 프로그레스 바 업데이트
        const progressDegree = ((10 - timeLeft) / 10) * 360;
        timerCircle.style.background = `conic-gradient(from 0deg, #ff9800 ${progressDegree}deg, rgba(255, 255, 255, 0.2) ${progressDegree}deg)`;
        
        if (timeLeft <= 0) {
            clearInterval(automationFlowTimer);
            
            // 완료 상태로 변경
            timerText.textContent = '완료';
            
            // 2초 후 자동으로 다시 시작
            setTimeout(() => {
                endAutomationFlow();
            }, 2000);
        }
    }, 1000);
}

// 단계별 처리 (jab.html 방식)
function processSteps(steps, index) {
    if (index >= steps.length) return;

    const step = steps[index];
    const stepElement = document.getElementById(step.id);
    const arrowElement = document.getElementById(`arrow${index + 1}`);
    const progressBar = document.getElementById('flowProgressBar');

    // 프로그레스바 업데이트
    const progress = ((index + 1) / steps.length) * 100;
    if (progressBar) {
        progressBar.style.width = progress + '%';
    }

    // 현재 단계 활성화
    if (stepElement) {
        stepElement.classList.add('processing');
        if (arrowElement) arrowElement.classList.add('active');
    }

    setTimeout(() => {
        if (stepElement) {
            stepElement.classList.remove('processing');
            stepElement.classList.add('active');
        }
        
        step.action();

        // 다음 단계로
        setTimeout(() => {
            processSteps(steps, index + 1);
        }, 200);
    }, step.duration);
}

// 모든 스텝 초기화
function resetAllSteps() {
    // 모든 단계 초기화
    document.querySelectorAll('.flow-step').forEach(step => {
        step.classList.remove('active', 'processing');
    });
    
    // 모든 화살표 초기화
    document.querySelectorAll('.flow-arrow').forEach(arrow => {
        arrow.classList.remove('active');
    });
}

// 자동 처리 플로우 완료
function completeAutomationFlow() {
    if (!currentScenario) return;
    
    // 시나리오별 완료 메시지
    const completionMessages = {
        'malware_detection': '악성코드가 성공적으로 격리되어 시스템이 안전합니다.',
        'phishing_attack': '피싱 공격이 차단되어 사용자 계정이 보호되었습니다.',
        'lateral_movement': '횡적 이동이 차단되어 네트워크 침해가 방지되었습니다.',
        'data_exfiltration': '데이터 유출이 차단되어 중요 정보가 보호되었습니다.',
        'privilege_escalation': '권한 상승 시도가 차단되어 시스템 권한이 보호되었습니다.',
        'suspicious_process': '의심스러운 프로세스가 종료되어 시스템이 정상화되었습니다.',
        'network_anomaly': '네트워크 이상 활동이 차단되어 통신이 정상화되었습니다.',
        'endpoint_isolation': '감염된 엔드포인트가 격리되어 확산이 방지되었습니다.'
    };
    
    const message = completionMessages[currentScenario.id] || '보안 위협이 성공적으로 처리되었습니다.';
    
    // 완료 토스트
    createToast('success', `✅ ${currentScenario.title} 완료`, message);
    
    console.log(`${currentScenario.title} 자동 처리 완료`);
}

// 자동 처리 플로우 초기화 및 재시작 준비
function endAutomationFlow() {
    automationFlowActive = false;
    
    // 타이머 정리
    if (automationFlowTimer) {
        clearInterval(automationFlowTimer);
        automationFlowTimer = null;
    }
    
    if (automationStepTimer) {
        clearTimeout(automationStepTimer);
        automationStepTimer = null;
    }
    
    // 스텝 초기화
    resetAllSteps();
    currentFlowStep = 0;
    
    // 현재 처리 정보 초기화
    const currentInfo = document.getElementById('currentProcessingIncident');
    if (currentInfo) {
        currentInfo.textContent = '처리 대기중...';
    }
    
    // 플로우 콘텐츠는 그대로 두고 (전체 플로우가 숨겨짐)
    const flowContent = document.getElementById('flowContent');
    if (flowContent) {
        flowContent.classList.add('visible');
        flowContent.classList.remove('hidden');
    }
    
    // 프로그레스바 초기화
    const progressBar = document.getElementById('flowProgressBar');
    if (progressBar) {
        progressBar.style.width = '0%';
    }
    
    // 타이머 초기화
    const timerText = document.querySelector('.timer-text');
    const timerCircle = document.querySelector('.timer-circle');
    if (timerText) timerText.textContent = '10';
    if (timerCircle) timerCircle.style.background = 'conic-gradient(from 0deg, #ff9800 0deg, rgba(255, 255, 255, 0.2) 0deg)';
    
    // 15초 후 자동으로 다시 시작
    setTimeout(() => {
        startAutomationFlow();
    }, 15000);
}

// 페이지 로드 시 자동 플로우 시스템 초기화
document.addEventListener('DOMContentLoaded', function() {
    // 플로우를 항상 표시 상태로 설정
    const flowElement = document.getElementById('automationFlow');
    if (flowElement) {
        flowElement.classList.add('show');
    }
    
    // 5초 후에 첫 번째 플로우 시작
    setTimeout(() => {
        console.log('첫 번째 자동 처리 플로우 시작');
        startAutomationFlow();
    }, 5000); // 페이지 로드 후 5초 대기
}; // window.initDashboard 함수 종료
