"use client";

import { useEffect, useState, useRef } from "react";

const MOCK_USER = { uid: "user_1", hasSeenTooltip: false, lastSnapDate: null };

// 데일리 미션 풀 - 날짜기준 자동 선택 (index = dateNum % pool.length)
const MISSION_POOL = [
  { prefix: "오늘 내 시야에 들어온", keyword: "가장 선명한 빨간색" },
  { prefix: "스쳐 지나쳐도 궁금하지 않았던", keyword: "벽의 표면" },
  { prefix: "엄청 많지만 유심한 적 없던", keyword: "오늘 하늘의 구름" },
  { prefix: "누군가가 남기고 간", keyword: "귀여운 흔적" },
  { prefix: "지금 이 순간의", keyword: "빛과 그림자" },
  { prefix: "남들이 모르는", keyword: "미세한 패턴" },
  { prefix: "오늘 일상에서 발견한", keyword: "예상치 못한 색" },
];

const getTodayMission = () => {
  const today = new Date();
  const dateNum = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const idx = dateNum % MISSION_POOL.length;
  return { id: `mission_${dateNum}`, date: today.toISOString().split('T')[0], ...MISSION_POOL[idx] };
};

interface MonthlySummary {
  id: string;
  month: string;
  title: string;
  tags: string[]; // spec says 'desc' string but tags array is more flexible for UI, joining with dot later
  fullText: string;
  isClaimed: boolean;
  theme: 'orange' | 'blue' | 'purple';
}

export default function App() {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<{uid:string, hasSeenTooltip:boolean, lastSnapDate:string|null}>(MOCK_USER);
  const mission = getTodayMission();
  const [snaps, setSnaps] = useState<any[]>([]);
  
  // 리포트 데이터 (명세서 기반 데이터 구조)
  const [monthlyReports, setMonthlyReports] = useState<MonthlySummary[]>([
    {
      id: "report_2026_03",
      month: "2026. 03",
      title: "차분한 봄의 관찰자",
      tags: ["봄 활동 70%", "무채색 선호"],
      fullText: "당신은 이번 달 유독 차분한 무채색의 풍경에 시선을 멈추었네요. 일상 속에 숨어있는 고요한 질감을 찾아내는 능력이 탁월합니다.",
      isClaimed: false,
      theme: 'orange'
    },
    {
       id: "report_2026_02",
       month: "2026. 02",
       title: "활기찬 아침의 탐험가",
       tags: ["아침 활동 80%", "난색 선호"],
       fullText: "활기 넘치는 아침의 에너지를 붉은 계열의 색상으로 기록해 주셨습니다. 따뜻한 시선으로 일상의 온도를 높이는 탐험가시군요.",
       isClaimed: true,
       theme: 'blue'
    }
  ]);

  const getThemeColor = (theme: string) => {
      switch (theme) {
          case 'stone': return '#78716c';
          case 'orange': return '#f97316';
          case 'blue': return '#3b82f6';
          case 'green': return '#10b981';
          case 'purple': return '#a855f7';
          default: return '#f97316';
      }
  };
  const [currentTab, setCurrentTab] = useState("home");
  const [tempImageUrl, setTempImageUrl] = useState<string | null>(null);
  
  const [activeModal, setActiveModal] = useState<'report' | 'snap' | 'uploadOptions' | null>(null);
  const [modalData, setModalData] = useState<any>(null);

  // Drag to scroll logic for carousel
  const carouselRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [dragged, setDragged] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!carouselRef.current) return;
    setIsDragging(true);
    setDragged(false);
    setStartX(e.pageX - carouselRef.current.offsetLeft);
    setScrollLeft(carouselRef.current.scrollLeft);
  };
  const handleMouseLeave = () => setIsDragging(false);
  const handleMouseUp = () => setIsDragging(false);
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !carouselRef.current) return;
    e.preventDefault();
    const x = e.pageX - carouselRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    if (Math.abs(walk) > 5) setDragged(true);
    carouselRef.current.scrollLeft = scrollLeft - walk;
  };

  useEffect(() => {
    const lUser = localStorage.getItem("user");
    const lSnaps = localStorage.getItem("snaps");
    const lReports = localStorage.getItem("monthlyReports");
    if (lUser) setUser(JSON.parse(lUser));
    if (lSnaps) setSnaps(JSON.parse(lSnaps));
    if (lReports) setMonthlyReports(JSON.parse(lReports));
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem("user", JSON.stringify(user));
      try {
        localStorage.setItem("snaps", JSON.stringify(snaps));
      } catch (error) {
        console.error("Storage saving error:", error);
      }
      localStorage.setItem("monthlyReports", JSON.stringify(monthlyReports));
    }
  }, [user, snaps, monthlyReports, mounted]);

  const navigate = (tab: string) => {
    if (tab !== 'home' && tempImageUrl) {
      confirmSnapAndGo(tab);
      return;
    }
    setCurrentTab(tab);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 600;
          let width = img.width;
          let height = img.height;
          if (width > MAX_WIDTH) { height = Math.round((height * MAX_WIDTH) / width); width = MAX_WIDTH; }
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          setTempImageUrl(canvas.toDataURL('image/webp', 0.6));
          setActiveModal(null);
        };
        if (ev.target?.result) img.src = ev.target.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const todaySnap = snaps.find(s => s.missionId === mission.id && s.uid === user.uid && s.createdAt.startsWith(todayStr));
  const hasSnappedToday = user.lastSnapDate === todayStr && !!todaySnap;

  const confirmSnap = () => {
    if (hasSnappedToday && todaySnap) {
       const updatedSnaps = snaps.map(s => s.id === todaySnap.id ? { ...s, imageUrl: tempImageUrl } : s);
       setSnaps(updatedSnaps);
    } else {
       const newSnap = {
           id: "s_" + Date.now(), uid: user.uid, missionId: mission.id, imageUrl: tempImageUrl,
           createdAt: new Date().toISOString(), dayCount: snaps.length + 1
       };
       setSnaps([newSnap, ...snaps]);
       setUser({ ...user, lastSnapDate: todayStr });
    }
    setTempImageUrl(null);
  };

  const confirmSnapAndGo = (tab: string) => {
    confirmSnap();
    setCurrentTab(tab);
  };

  const renderHeader = () => {
    return (
      <header className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
           <div className="header-logo" style={{lineHeight: 0}}><img src="/Logo.svg" alt="Snappy" style={{height: '56px', marginLeft:'-8px', objectFit: 'contain'}} /></div>
           <div className="header-sub" style={{marginTop:'0.3rem'}}><span style={{color: 'var(--primary)', fontSize:'1.1rem'}}>⚡</span> 매일 찰칵, 일상 줍기</div>
        </div>
        
        {/* 우상단 라벨 삭제됨 */}
      </header>
    );
  };

  if (!mounted) return null;
  
  return (
    <div className="app-container">
      {renderHeader()}
      
      <main className="section fade-in" style={currentTab === 'archive' ? {paddingTop: 0} : {}}>
        {/* Home Tab */}
        {currentTab === 'home' && (
          <>
            <input type="file" ref={fileInputRef} style={{display:'none'}} accept="image/*" onChange={handleImageUpload} />
            <input type="file" ref={cameraInputRef} style={{display:'none'}} accept="image/*" capture="environment" onChange={handleImageUpload} />

            <div className="badge-wrapper">
              <span className="day-badge">DAY {String(snaps.length + (hasSnappedToday ? 0 : 1)).padStart(2, '0')}</span>
              <span className="date-badge">{todayStr.replace(/-/g, '.')}</span>
            </div>

            <div className="mission-text">
              {mission.prefix}<br/>
              <span style={{color:'var(--text-main)'}}>{mission.keyword.split(' ').slice(0, -1).join(' ')} </span>
              <span style={{color:'var(--primary)'}}>{mission.keyword.split(' ').slice(-1)[0]}</span>
            </div>

            {(!hasSnappedToday && !tempImageUrl) ? (
              <div className="dashed-box">
                <button className="snap-btn" onClick={() => setActiveModal('uploadOptions')}>
                    <i className="ri-camera-fill"></i>
                </button>
                <div className="snap-title">스내피 찍기</div>
                <div className="snap-desc">화면을 탭하여 순간을 남기세요</div>
              </div>
            ) : (
              <>
                <div className="uploaded-photo-card fade-in">
                    <img src={tempImageUrl || todaySnap?.imageUrl} className="uploaded-photo-img" alt="snap" />
                    <div className="uploaded-photo-overlay">
                        <div className="overlay-sub">SNAPPY SHOT</div>
                        <div className="overlay-title">{mission.keyword}</div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '-1rem', marginBottom: '1.5rem' }}>
                    <button
                        onClick={() => setActiveModal('uploadOptions')}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '1rem', borderRadius: '1.25rem', background: '#f5f5f4', color: '#57534e', fontWeight: 800, fontSize: '0.9rem' }}
                    >
                        <i className="ri-loop-left-line" style={{ fontSize: '1.1rem' }}></i> 다시 찍기
                    </button>
                    {!hasSnappedToday && (
                        <button
                            onClick={confirmSnap}
                            style={{ flex: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '1rem', borderRadius: '1.25rem', background: 'var(--primary)', color: 'white', fontWeight: 800, fontSize: '1rem', boxShadow: '0 8px 15px rgba(249, 115, 22, 0.2)' }}
                        >
                            <i className="ri-check-line" style={{ fontSize: '1.2rem' }}></i> 기록 완료
                        </button>
                    )}
                </div>
              </>
            )}
          </>
        )}

        {/* Archive Tab (내 보관함) */}
        {currentTab === 'archive' && (
          <div style={{ paddingBottom: '3rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', marginTop: '0.5rem' }}>
               <div>
                 <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-1.5px', marginBottom: '1.5rem', lineHeight: 1 }}>보관함</div>
                 <div style={{ fontSize: '1rem', fontWeight: 700, color: '#A1A1AA', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{color: 'var(--primary)', fontSize:'1.1rem'}}>🔥</span> {snaps.length}개의 시선을 모았어요!
                 </div>
               </div>
            </div>

            {/* 리포트 섹션: 스냅이 있을 때만 노출 */}
            {snaps.length > 0 ? (
              <>
                {monthlyReports.length > 0 && (
                  <div style={{ marginBottom: '2.5rem' }}>
                    
                    {/* 1. 대기 중인 리포트 배너 (Glassmorphism + Aurora Ambient) */}
                    {monthlyReports.find(r => !r.isClaimed) && (
                      <div 
                        className="pending-glass-card"
                        onClick={() => { setModalData(monthlyReports.find(r => !r.isClaimed)); setActiveModal('report'); }}
                      >
                          <div className="aurora-orb orb-top-right"></div>
                          <div className="aurora-orb orb-bottom-left"></div>

                          <div className="squircle-icon-box">
                              <i className="ri-sparkling-fill" style={{ color: 'white', fontSize: '1.5rem' }}></i>
                          </div>

                          <div style={{ flex: 1, zIndex: 2, position: 'relative' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                                  <span className="pending-banner-sub">MONTHLY AI</span>
                                  <span className="pending-new-badge">NEW</span>
                              </div>
                              <h2 className="pending-banner-title">
                                  3월의 시선 요약이<br/>도착했어요 💌
                              </h2>
                          </div>

                          <div className="pending-chevron-box" style={{ zIndex: 2 }}>
                              <i className="ri-arrow-right-s-line" style={{ color: '#D4D4D8', fontSize: '1.5rem' }}></i>
                          </div>
                      </div>
                    )}

                    {/* 2. 소장된 리포트 캐러셀 (Exhibition Ticket Concept) */}
                    {monthlyReports.filter(r => r.isClaimed).length > 0 && (
                      <div className="carousel-wrapper">
                        <div 
                          className={`carousel-scroll fade-in ${isDragging ? 'active' : ''}`}
                          ref={carouselRef}
                          onMouseDown={handleMouseDown}
                          onMouseLeave={handleMouseLeave}
                          onMouseUp={handleMouseUp}
                          onMouseMove={handleMouseMove}
                        >
                          {[...monthlyReports.filter(r => r.isClaimed)].reverse().map(r => {
                            const match = r.month.match(/(\d{4})[.\-\s]+(\d{1,2})/);
                            const labelNo = match ? match[1] + (match[2].padStart(2,'0')) : r.month.replace(/\D/g, '');
                            return (
                              <div 
                                key={r.id} 
                                className="exhibition-ticket"
                                onClick={() => { if(!dragged) { setModalData(r); setActiveModal('report'); } }}
                              >
                                <div className="ticket-edge-point" style={{ background: getThemeColor(r.theme) }}></div>
                                
                                <div style={{ flex: 1, padding: '1.25rem 1.25rem 1.25rem 1.5rem', overflow: 'hidden', textAlign: 'left' }}>
                                    <span className="ticket-serial">NO. {labelNo}</span>
                                    <h3 className="ticket-title">{r.title}</h3>
                                    <p className="ticket-tags">{r.tags.join(' · ')}</p>
                                </div>

                                <div className="ticket-divider"></div>
                                <div className="ticket-chevron-area">
                                    <i className="ri-arrow-right-s-line ticket-chevron-icon"></i>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 그리드 갤러리 */}
                <div className="grid-gallery">
                    {[...snaps].reverse().map(snap => (
                        <div key={snap.id} className="grid-item" onClick={() => { setModalData(snap); setActiveModal('snap'); }}>
                            <img src={snap.imageUrl} alt="snap" />
                        </div>
                    ))}
                </div>
              </>
            ) : (
                <div style={{textAlign:'center', padding: '5rem 1rem', color:'#A1A1AA', fontWeight: 700}}>
                  아직 기록된 시선이 없습니다.<br/>오늘의 미션을 수행해보세요!
                </div>
            )}
          </div>
        )}
      </main>

      {/* === BOTTOM NAV === */}
      <nav className="bottom-nav">
          <div className={`nav-item ${currentTab === 'home' ? 'active' : ''}`} onClick={() => setCurrentTab('home')}>
             <i className={currentTab === 'home' ? 'ri-send-plane-fill' : 'ri-send-plane-line'}></i>
             <span>투데이</span>
          </div>
          <div className={`nav-item ${currentTab === 'archive' ? 'active' : ''}`} onClick={() => navigate('archive')}>
             <i className={currentTab === 'archive' ? 'ri-layout-grid-fill' : 'ri-layout-grid-line'}></i>
             <span>보관함</span>
          </div>
      </nav>

      {/* === MODALS PORTAL === */}
      {activeModal && (
        <div className="modal-overlay active" onClick={() => setActiveModal(null)} style={{justifyContent: activeModal === 'uploadOptions' ? 'flex-end' : 'center', padding: activeModal === 'uploadOptions' ? '0' : '1.5rem', alignItems: activeModal === 'uploadOptions' ? 'flex-end' : 'center'}}>
          
          <div className="absolute-bottom-wrap">
            {activeModal === 'uploadOptions' && (
               <div className="bottom-sheet" onClick={(e)=>e.stopPropagation()}>
                  <div style={{fontWeight: 800, fontSize: '1.4rem', marginBottom: '2rem', textAlign: 'center', color:'#1c1917'}}>어떤 방식으로 추가할까요?</div>
                  <div style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
                      <button className="btn-primary" style={{background: '#1c1917', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center'}} onClick={() => cameraInputRef.current?.click()}>
                          <i className="ri-camera-lens-line" style={{fontSize:'1.35rem', marginRight:'0.5rem'}}></i> 사진 촬영하기
                      </button>
                      <button className="btn-primary" style={{background: '#f5f5f4', color: '#1c1917', boxShadow:'none', display: 'flex', justifyContent: 'center', alignItems: 'center'}} onClick={() => fileInputRef.current?.click()}>
                          <i className="ri-image-line" style={{fontSize:'1.35rem', marginRight:'0.5rem'}}></i> 앨범에서 선택
                      </button>
                  </div>
              </div>
            )}
          </div>

          {activeModal === 'report' && modalData && (
             <div className="modal-content-center" style={{padding: '1.5rem', width: '90%', maxWidth: '380px', borderRadius: '1.75rem', background: '#f5f5f4', boxShadow: '0 20px 40px rgba(0,0,0,0.2)'}} onClick={(e)=>e.stopPropagation()}>
                {/* Header */}
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem'}}>
                    <div style={{textAlign: 'left'}}>
                        <div style={{fontSize:'0.75rem', fontWeight:900, color:'var(--primary)', letterSpacing:'1px', marginBottom: '0.4rem'}}><i className="ri-flashlight-fill"></i> MONTHLY AI</div>
                        <div style={{fontSize:'1.6rem', fontWeight:900, lineHeight: 1.25, color: '#1c1917'}}>
                            {(() => {
                              const match = modalData.month.match(/(\d{4})[.\-\s]+(\d{1,2})/);
                              return match ? `${match[1]}년 ${parseInt(match[2])}월` : modalData.month;
                            })()}의<br/>시선 기록
                        </div>
                    </div>
                    <button onClick={() => setActiveModal(null)} style={{width: '36px', height: '36px', borderRadius: '50%', background: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#78716c', boxShadow: '0 2px 5px rgba(0,0,0,0.05)'}}>
                        <i className="ri-close-line" style={{fontSize: '1.3rem'}}></i>
                    </button>
                </div>

                {/* Ticket Body */}
                <div style={{ position: 'relative', background: 'white', borderRadius: '1rem', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', marginBottom: '1.5rem', marginTop: '1.5rem' }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '12px', background: getThemeColor(modalData.theme), zIndex: 10 }}></div>
                    <div style={{ padding: '1.5rem 1.5rem 1.5rem 2.2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                            <div style={{ textAlign: 'left' }}>
                                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#a8a29e', letterSpacing: '2px', marginBottom: '0.2rem' }}>GALLERY OF SNAPPY</div>
                                <div style={{ fontSize: '0.65rem', fontWeight: 900, color: getThemeColor(modalData.theme), letterSpacing: '1px' }}>MONTHLY EXHIBITION</div>
                            </div>
                            <div style={{ border: '1px solid #1c1917', borderRadius: '6px', padding: '0.2rem 0.5rem', fontSize: '0.7rem', fontWeight: 900, color: '#1c1917', letterSpacing: '0.5px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                NO. {(() => { const match = modalData.month.match(/(\d{4})[.\-\s]+(\d{1,2})/); return match ? `${match[1]}-${match[2].padStart(2,'0')}` : modalData.month; })()}
                            </div>
                        </div>
                        <div style={{ textAlign: 'left', fontSize: '1.8rem', fontWeight: 900, color: '#1c1917', lineHeight: 1.25, letterSpacing: '-1px', wordBreak: 'keep-all', width: '90%' }}>
                            {modalData.title.split(' ').map((w: string, i: number) => i === 0 ? <span key={i}>{w}<br/></span> : <span key={i}>{w} </span>)}
                        </div>
                    </div>
                    <div style={{ position: 'relative', height: '1px', width: '100%', display: 'flex', alignItems: 'center' }}>
                        <div style={{ position: 'absolute', left: '-10px', width: '20px', height: '20px', borderRadius: '50%', background: '#f5f5f4', zIndex: 11 }}></div>
                        <div style={{ width: '100%', borderTop: '2px dashed #d6d3d1' }}></div>
                        <div style={{ position: 'absolute', right: '-10px', width: '20px', height: '20px', borderRadius: '50%', background: '#f5f5f4', zIndex: 11 }}></div>
                    </div>
                    <div style={{ padding: '2rem 1.5rem 1.5rem 2.2rem', position: 'relative', textAlign: 'left' }}>
                        <div style={{ position: 'absolute', top: '1.75rem', right: '1.5rem', width: '65px', height: '65px', borderRadius: '50%', border: `2px solid ${getThemeColor(modalData.theme)}`, display: 'flex', justifyContent: 'center', alignItems: 'center', color: getThemeColor(modalData.theme), fontWeight: 900, fontSize: '0.65rem', textAlign: 'center', transform: 'rotate(-15deg)', lineHeight: 1.15, letterSpacing: '1px', opacity: 0.35 }}>
                            ADMIT<br/>ONE
                        </div>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#a8a29e', letterSpacing: '1px', marginBottom: '0.4rem' }}>DATE</div>
                            <div style={{ fontSize: '1.rem', fontWeight: 900, color: '#1c1917', letterSpacing: '2px', fontFamily: 'monospace' }}>{modalData.month}</div>
                        </div>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#a8a29e', letterSpacing: '1px', marginBottom: '0.6rem' }}>CURATED THEMES</div>
                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                {modalData.tags.map((t: string) => (
                                    <span key={t} style={{ border: '1px solid #e7e5e4', background: '#fafaf9', padding: '0.4rem 0.6rem', borderRadius: '0.5rem', fontSize: '0.8rem', fontWeight: 800, color: '#44403c' }}>
                                        {t}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div style={{ borderTop: '1px solid #f5f5f4', margin: '0 0 1.5rem 0' }}></div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#44403c', lineHeight: 1.6, wordBreak: 'keep-all' }}>
                            "{modalData.fullText}"
                        </div>
                    </div>
                </div>
                
                {modalData.isClaimed ? (
                  <button className="btn-primary" style={{background:'#1c1917', color:'white', width: '100%', borderRadius: '99px', fontSize: '1.1rem', padding: '1.1rem'}} onClick={() => setActiveModal(null)}>닫기</button>
                ) : (
                  <button className="btn-primary" style={{background:'#1c1917', color:'white', width: '100%', borderRadius: '99px', fontSize: '1.1rem', padding: '1.1rem'}} onClick={() => {
                     setMonthlyReports(monthlyReports.map(r => r.id === modalData.id ? { ...r, isClaimed: true } : r));
                     setActiveModal(null);
                  }}>보관함에 간직하기</button>
                )}
             </div>
          )}
          
          {activeModal === 'snap' && modalData && (
             <div className="modal-content-center" style={{padding: 0, overflow:'hidden', maxWidth:'320px'}} onClick={(e)=>e.stopPropagation()}>
                <button className="close-btn" style={{color:'white', zIndex:10, background:'rgba(0,0,0,0.4)', borderRadius:'50%', width:'32px', height:'32px', display:'flex', alignItems:'center', justifyContent:'center', position: 'absolute', top: '15px', right: '15px'}} onClick={() => setActiveModal(null)}>
                  <i className="ri-close-line"></i>
                </button>
                <img src={modalData.imageUrl} alt="snap" style={{width:'100%', aspectRatio:1, objectFit:'cover', display:'block'}} />
                <div style={{padding: '1.5rem'}}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem'}}>
                        <span className="day-badge" style={{margin:0}}>Day {modalData.dayCount}</span>
                        <span style={{color:'var(--text-sub)', fontSize:'0.85rem', fontWeight:600}}>
                           {new Date(modalData.createdAt).toISOString().split('T')[0].replace(/-/g, '.')}
                        </span>
                    </div>
                    <div style={{fontWeight:800, fontSize:'1.25rem', color:'#1c1917'}}>{mission.keyword}</div>
                </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
