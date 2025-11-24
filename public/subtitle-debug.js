// 브라우저 콘솔에서 실행할 자막 디버깅 스크립트
// 사용법: F12 → Console → 이 파일 내용 복사 & 붙여넣기

(function debugSubtitles() {
  console.log('=== 자막 디버깅 시작 ===\n');

  const video = document.querySelector('video');

  if (!video) {
    console.error('❌ 비디오 요소를 찾을 수 없습니다');
    return;
  }

  console.log('✅ 비디오 요소 발견');
  console.log('비디오 소스:', video.currentSrc);
  console.log('재생 상태:', video.paused ? '정지' : '재생 중');
  console.log('현재 시간:', video.currentTime.toFixed(2) + '초');
  console.log('\n');

  // 텍스트 트랙 정보
  console.log('--- 텍스트 트랙 정보 ---');
  console.log('트랙 개수:', video.textTracks.length);

  if (video.textTracks.length === 0) {
    console.error('❌ 텍스트 트랙이 없습니다!');
    console.log('\n<track> 태그가 제대로 추가되었는지 확인하세요:');
    console.log('<track kind="subtitles" src="/defender_x.srt" srclang="ko" label="한국어" default>');
    return;
  }

  for (let i = 0; i < video.textTracks.length; i++) {
    const track = video.textTracks[i];
    console.log(`\n트랙 ${i}:`);
    console.log('  kind:', track.kind);
    console.log('  label:', track.label);
    console.log('  language:', track.language);
    console.log('  mode:', track.mode);
    console.log('  readyState:', track.readyState || 'N/A');

    if (track.cues) {
      console.log('  ✅ cues 로드됨:', track.cues.length + '개');

      if (track.cues.length > 0) {
        console.log('\n  첫 3개 자막:');
        for (let j = 0; j < Math.min(3, track.cues.length); j++) {
          const cue = track.cues[j];
          console.log(`    [${cue.startTime.toFixed(1)}s - ${cue.endTime.toFixed(1)}s] ${cue.text}`);
        }
      }

      // 현재 활성 자막
      if (track.activeCues && track.activeCues.length > 0) {
        console.log('\n  🎯 현재 활성 자막:');
        for (let k = 0; k < track.activeCues.length; k++) {
          console.log('    ' + track.activeCues[k].text);
        }
      } else {
        console.log('\n  ⚠️ 현재 활성 자막 없음 (비디오 시간:', video.currentTime.toFixed(2) + '초)');
      }
    } else {
      console.error('  ❌ cues가 null입니다 (자막 파일 로드 실패)');
    }
  }

  console.log('\n--- CSS 스타일 확인 ---');
  const styles = window.getComputedStyle(video);
  console.log('비디오 z-index:', styles.zIndex);
  console.log('비디오 position:', styles.position);

  // SRT 파일 직접 확인
  console.log('\n--- SRT 파일 다운로드 테스트 ---');
  fetch('/defender_x.srt')
    .then(response => {
      console.log('SRT 응답 상태:', response.status, response.statusText);
      console.log('Content-Type:', response.headers.get('content-type'));
      return response.text();
    })
    .then(text => {
      console.log('✅ SRT 파일 크기:', text.length, 'bytes');
      console.log('첫 200자:\n' + text.substring(0, 200));
    })
    .catch(err => {
      console.error('❌ SRT 다운로드 실패:', err);
    });

  // 자막 강제 활성화 함수 제공
  window.enableSubtitles = function() {
    if (video.textTracks.length > 0) {
      video.textTracks[0].mode = 'showing';
      console.log('✅ 자막 강제 활성화됨');
      debugSubtitles();
    }
  };

  window.disableSubtitles = function() {
    if (video.textTracks.length > 0) {
      video.textTracks[0].mode = 'hidden';
      console.log('⚠️ 자막 비활성화됨');
    }
  };

  window.seekToSubtitle = function(seconds) {
    video.currentTime = seconds || 5;
    video.play();
    console.log('▶️ 비디오를', seconds || 5, '초로 이동 + 재생');
  };

  console.log('\n=== 디버깅 함수 사용법 ===');
  console.log('enableSubtitles()  - 자막 강제 활성화');
  console.log('disableSubtitles() - 자막 비활성화');
  console.log('seekToSubtitle(10) - 10초로 이동하여 자막 확인');
  console.log('\n예: seekToSubtitle(5) 실행하면 5초 지점의 자막을 볼 수 있습니다');
})();
