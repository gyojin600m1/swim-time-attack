/* Shared, input-driven swimming animation. No network, storage or game rules. */
(function () {
  'use strict';
  const TAU = Math.PI * 2;
  const clamp = v => Math.max(0, Math.min(1, v));
  const mix = (a, b, p) => a + (b - a) * clamp(p);
  function draw(c, o) {
    const phase = clamp(o.phase || 0), active = phase < .999;
    const stroke = o.stroke || 'free', back = stroke === 'back';
    const s = o.size || 2.4, side = o.side === 'L' ? -1 : 1;
    const skin = '#efba92', shade = '#b97d60', cap = back ? '#ffd15e' : '#4bdbb0';
    c.save(); c.scale(s, s); c.lineCap = 'round'; c.lineJoin = 'round';
    if (o.turn > 0 && o.turn < 1) {
      c.scale(1, Math.max(.24, Math.abs(Math.cos(o.turn * Math.PI))));
    }
    const undulation = active && stroke === 'fly' ? Math.sin(phase * TAU) : 0;
    const roll = !o.underwater && (stroke === 'free' || back) ? side * Math.sin(phase * Math.PI) * .24 : 0;
    c.rotate(roll);
    c.translate(0, -undulation * 1.8);
    c.globalAlpha = .17; c.fillStyle = '#8fe9ff'; c.beginPath();
    c.ellipse(0, 17, 8 + (o.speed || 0), 19 + (o.speed || 0) * 3, 0, 0, TAU); c.fill(); c.globalAlpha = 1;
    function limb(points, above, width) {
      c.save(); c.strokeStyle = above ? skin : shade; c.lineWidth = width || 2.8;
      if (above) { c.shadowColor = 'rgba(0,0,0,.4)'; c.shadowBlur = 3; c.shadowOffsetY = 1.5; }
      c.beginPath(); c.moveTo(points[0], points[1]);
      for (let k = 2; k < points.length; k += 2) c.lineTo(points[k], points[k + 1]); c.stroke();
      c.restore();
    }
    // Paired arms travel continuously: entry -> catch -> push -> recovery -> entry.
    function butterflyArm(m) {
      let x, y, ex, ey, air = phase >= .55;
      if (phase < .18) { const p = phase / .18; x = mix(2, 12, p); y = mix(-22, -13, p); ex = mix(3, 9, p); ey = -11; }
      else if (phase < .55) { const p = (phase - .18) / .37; x = mix(12, 6, p); y = mix(-13, 16, p); ex = 10; ey = mix(-7, 8, p); }
      else { const p = (phase - .55) / .45; x = 6 * (1-p) + 19 * Math.sin(p*Math.PI); y = mix(16,-22,p); ex = 5 + 14 * Math.sin(p*Math.PI); ey = mix(7,-14,p); }
      limb([m*4,-3,m*ex,ey,m*x,y],air);
    }
    function crawlArm(m) {
      const p = m === side ? phase : (phase + .5) % 1;
      const air = p >= .55;
      if (!air) { const q = p/.55; limb([m*4,-3,m*(9+Math.sin(q*Math.PI)*3),mix(-10,8,q),m*mix(3,6,q),mix(-22,16,q)],false); }
      else { const q = (p-.55)/.45; limb([m*4,-3,m*(back?7:13),mix(9,-15,q),m*(3+Math.sin(q*Math.PI)*(back?3:7)),mix(16,-22,q)],true); }
    }
    function breastArms(m) {
      let x,y,ex,ey;
      if (phase < .25) { const p=phase/.25; x=mix(1,13,p);y=mix(-22,-9,p);ex=mix(3,10,p);ey=-11; }
      else if (phase < .45) { const p=(phase-.25)/.2;x=mix(13,2,p);y=mix(-9,-3,p);ex=mix(10,7,p);ey=mix(-8,0,p); }
      else { const p=clamp((phase-.45)/.22);x=mix(2,1,p);y=mix(-3,-22,p);ex=mix(7,3,p);ey=mix(0,-13,p); }
      limb([m*4,-3,m*ex,ey,m*x,y],false);
    }
    for (const m of [-1,1]) {
      if (o.underwater || o.finish) limb([m*4,-3,m*3,-13,m*1,-23],false);
      else if (stroke === 'fly') butterflyArm(m);
      else if (stroke === 'breast') breastArms(m);
      else crawlArm(m);
    }
    // Breaststroke: heels recover together, feet turn out, whip closes, streamline holds.
    for (const m of [-1,1]) {
      if (stroke === 'breast' && !o.underwater) {
        let knee=2,ky=18,foot=1.8,fy=26;
        if (phase >= .25 && phase < .55) { const q=(phase-.25)/.30;knee=mix(2,7,q);ky=mix(18,16,q);foot=mix(1.8,9,q);fy=mix(26,17,q); }
        else if (phase >= .55 && phase < .76) {const q=(phase-.55)/.21;knee=mix(7,2,q);ky=mix(16,19,q);foot=mix(9,1.8,q);fy=mix(17,26,q);}
        limb([m*2,11,m*knee,ky,m*foot,fy],false,3);
        limb([m*foot,fy,m*(foot+(phase<.76&&phase>.4?2:.3)),fy+1.5],false,1.7);
      } else {
        const flutter = Math.sin((o.now||0)/65+(stroke==='fly'||o.underwater?0:m*Math.PI/2));
        const kick = stroke==='fly'&&!o.underwater ? Math.sin(phase*TAU*2-.8)*(active?1:0) : flutter;
        limb([m*2,11,m*2+kick*.8,19,m*2+kick*1.5,26+kick*1.6],false,2.9);
      }
    }
    // Trunk and face distinguish a back-facing swimmer from a face-down swimmer.
    c.fillStyle = back ? skin : '#2064a5'; c.beginPath(); c.ellipse(0,3,5.2,11.4,0,0,TAU); c.fill();
    c.fillStyle = '#123654'; c.beginPath(); c.ellipse(0,11,4.3,3.2,0,0,TAU); c.fill();
    if (back) {c.strokeStyle=shade;c.lineWidth=.55;c.beginPath();c.moveTo(-3.5,0);c.quadraticCurveTo(0,2,3.5,0);c.moveTo(0,2);c.lineTo(0,6);c.stroke();}
    const lift = o.breathing && !back ? -1.6 : 0;
    c.fillStyle = back || o.breathing ? skin : cap; c.beginPath(); c.ellipse(0,-9+lift,4.1,4.8,0,0,TAU);c.fill();
    c.fillStyle=cap;c.beginPath();c.ellipse(0,-11.4+lift,4,2.5,0,Math.PI,TAU);c.fill();
    if (back || o.breathing) {
      c.fillStyle='#122b42';c.beginPath();c.ellipse(-1.7,-10+lift,1.3,.9,0,0,TAU);c.ellipse(1.7,-10+lift,1.3,.9,0,0,TAU);c.fill();
      c.strokeStyle=shade;c.lineWidth=.6;c.beginPath();c.moveTo(0,-9+lift);c.lineTo(.5,-7.8+lift);c.stroke();
      c.fillStyle='#633b37';c.beginPath();c.ellipse(0,-6.8+lift,o.breathing?.9:1.2,o.breathing?1:.35,0,0,TAU);c.fill();
    } else { c.strokeStyle='#e4fffa';c.lineWidth=.6;c.beginPath();c.moveTo(-2,-10);c.quadraticCurveTo(0,-8,2,-10);c.stroke(); }
    c.restore();
  }
  window.SwimBody = Object.freeze({draw});
})();
