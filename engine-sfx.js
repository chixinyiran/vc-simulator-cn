// 音效引擎：Web Audio API 纯合成（零文件/零加载/零体积）
// 跟背景乐共存，轻音量不抢戏。可全局开关(跟随音乐开关)。
// 作者 小龙虾 2026-06-21
const Sfx = (function(){
  let ctx=null, master=null, enabled=true;
  const VOL=0.85;  // 音效总音量(明显高于背景乐,反馈清晰)

  function ensure(){
    if(!ctx){
      try{
        ctx=new (window.AudioContext||window.webkitAudioContext)();
        master=ctx.createGain(); master.gain.value=VOL;
        // 限幅压缩器：防止多层叠加剔波爆音,让音效更结实饱满(尤其震撼开场不糊)
        var comp=ctx.createDynamicsCompressor();
        comp.threshold.setValueAtTime(-3, ctx.currentTime);
        comp.knee.setValueAtTime(12, ctx.currentTime);
        comp.ratio.setValueAtTime(6, ctx.currentTime);
        comp.attack.setValueAtTime(0.003, ctx.currentTime);
        comp.release.setValueAtTime(0.15, ctx.currentTime);
        // makeup gain:压缩后补响度,保住冲击力(响而不爆)
        var makeup=ctx.createGain(); makeup.gain.value=1.5;
        master.connect(comp); comp.connect(makeup); makeup.connect(ctx.destination);
      }catch(e){ ctx=null; }
    }
    if(ctx && ctx.state==='suspended'){ try{ctx.resume();}catch(e){} }
    return ctx;
  }
  // 单音：频率/时长/波形/音量包络
  function tone(freq, start, dur, type='sine', peak=0.5, glideTo=null){
    if(!ctx) return;
    const o=ctx.createOscillator(), g=ctx.createGain();
    o.type=type; o.frequency.setValueAtTime(freq, ctx.currentTime+start);
    if(glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, ctx.currentTime+start+dur);
    g.gain.setValueAtTime(0.0001, ctx.currentTime+start);
    g.gain.exponentialRampToValueAtTime(peak, ctx.currentTime+start+0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime+start+dur);
    o.connect(g); g.connect(master);
    o.start(ctx.currentTime+start); o.stop(ctx.currentTime+start+dur+0.02);
  }
  // 琶音(多音依次)
  function arp(freqs, step, dur, type='triangle', peak=0.5){
    freqs.forEach((f,i)=>tone(f, i*step, dur, type, peak));
  }

  const lib={
    // 选项点选：清脆短"叮"
    pick(){ tone(880, 0, 0.10, 'triangle', 0.5); tone(1320,0.02,0.08,'sine',0.3); },
    // 封存确认：稳重"咚"(盖章感)
    confirm(){ tone(330,0,0.16,'sine',0.6,180); tone(165,0,0.20,'sine',0.45,110); },
    // 按钮通用 click
    click(){ tone(660,0,0.09,'square',0.5); tone(990,0.01,0.07,'sine',0.25); },
    // 翻页/推进
    swipe(){ tone(520,0,0.14,'triangle',0.5,820); tone(780,0.04,0.10,'sine',0.3); },
    // 开始游戏/启程：明亮上扬三音琴音，有仪式感(专门给重要入场动作)
    // 开始游戏/启程：史诗级震撼开场——低频上扫铺底+号角琶音爆发+顶点和弦齐鸣+高频闪耀
    start(){
      // ① 低频厚重铺底：低音上扫,奠定恢弘基底(像引擎/巨门开启)
      tone(98, 0, 0.55, 'sawtooth', 0.55, 196);
      tone(131, 0.02, 0.50, 'triangle', 0.45, 262);
      // ② 主号角：中频上扬琶音,明亮有力,层层推进
      tone(262, 0.04, 0.30, 'triangle', 0.55);
      tone(330, 0.10, 0.30, 'triangle', 0.6);
      tone(392, 0.16, 0.30, 'triangle', 0.65);
      tone(523, 0.22, 0.42, 'triangle', 0.7);
      // ③ 顶点和弦齐鸣：do-mi-sol-do↑ 同时炸开,饱满辉煌
      tone(523, 0.30, 0.5, 'triangle', 0.5);
      tone(659, 0.30, 0.5, 'triangle', 0.45);
      tone(784, 0.30, 0.5, 'sine', 0.5);
      tone(1047, 0.30, 0.55, 'triangle', 0.55);
      // ④ 高频闪耀：高音点缀+顶音收尾,光芒绽放
      tone(1568, 0.34, 0.45, 'sine', 0.4);
      tone(2093, 0.40, 0.5, 'sine', 0.3);
    },
    // 揭晓结果(按档位)
    SS(){ arp([523,659,784,1047,1319], 0.075, 0.28, 'triangle', 0.5); tone(1568,0.34,0.4,'sine',0.35); }, // 欢庆上行+亮顶
    S(){ arp([523,784,1047], 0.07, 0.24, 'triangle', 0.45); },   // 明亮三音
    A(){ tone(523,0,0.18,'sine',0.4); tone(659,0.06,0.16,'sine',0.3); }, // 中性双音
    B(){ tone(392,0,0.22,'sine',0.42,294); },  // 低沉下行
    C(){ tone(294,0,0.16,'sawtooth',0.4,180); tone(196,0.10,0.26,'sine',0.4,130); }, // 失落顿挫下坠
    // 结局：胜利/平/失落
    winBig(){ arp([523,659,784,1047,1319,1568], 0.09, 0.5, 'triangle', 0.5); tone(2093,0.6,0.6,'sine',0.3); },
    winMid(){ arp([523,659,784,1047], 0.10, 0.42, 'triangle', 0.45); },
    neutral(){ arp([440,554,659], 0.10, 0.35, 'sine', 0.4); },
    lose(){ tone(330,0,0.4,'sine',0.45,165); tone(247,0.18,0.5,'sine',0.4,123); }, // 缓缓下坠
    // 数值跳动(揭晓属性变化时的小滴答)
    tick(){ tone(1200,0,0.04,'square',0.15); },
  };

  // 首次用户交互时解锁 AudioContext(浏览器自动播放策略要求)
  let unlocked=false;
  function unlock(){
    if(unlocked) return;
    unlocked=true;
    ensure();
    // 在用户手势同步上下文立即 resume(这是浏览器唯一认可的解锁时机)
    if(ctx && ctx.state==='suspended'){ try{ ctx.resume(); }catch(e){} }
    // 播一个极轻的静默音“唤醒”音频管线
    if(ctx){ try{ const o=ctx.createOscillator(),g=ctx.createGain(); g.gain.value=0.0001; o.connect(g); g.connect(master); o.start(); o.stop(ctx.currentTime+0.02);}catch(e){} }
  }
  try{
    ['pointerdown','touchstart','click','keydown'].forEach(ev=>
      document.addEventListener(ev, unlock, {once:false, passive:true, capture:true}));
  }catch(e){}

  return {
    unlock,
    setEnabled(v){ enabled=!!v; },
    isEnabled(){ return enabled; },
    play(name){
      if(!enabled) return;
      if(!ensure()) return;
      const fn=lib[name];
      if(!fn) return;
      // ctx 刚解锁可能还是 suspended(resume 是异步)。
      // 关键:resume.then 的回调已脱离用户手势上下文,首声 oscillator 会被浏览器静音/丢弃。
      // 解法:resume 后轮询等 ctx.state 真正变 running 再播,确保振荡器在激活管线上发声。
      if(ctx.state==='suspended'){
        try{ ctx.resume(); }catch(e){}
        let tries=0;
        (function waitRun(){
          if(ctx.state==='running'){ try{ fn(); }catch(e){} return; }
          if(tries++>20){ try{ fn(); }catch(e){} return; }  // 兜底:最多等~400ms仍播
          try{ ctx.resume(); }catch(e){}
          setTimeout(waitRun, 20);
        })();
      } else {
        try{ fn(); }catch(e){}
      }
    },
    // 揭晓一组结果：取最高档位播代表音(避免多条叠成噪音)
    revealTier(tiers){
      if(!enabled||!ensure()) return;
      const order=['SS','S','A','B','C'];
      let best='C';
      for(const t of order){ if(tiers.includes(t)){ best=t; break; } }
      this.play(best);
    }
  };
})();
window.Sfx = Sfx;  // 显式挂全局,让 if(window.Sfx) 检查能过
