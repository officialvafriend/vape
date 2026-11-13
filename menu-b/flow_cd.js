/* 11/13 상담패드 C안, D안: B안(menu_b) 위에 얹는 손님용 단계 화면. 카닥 앱 방식(흰 바탕, 왼쪽 큰 질문, 줄 선택 + 오른쪽 ✓, 아래 꽉 찬 버튼, "알아보기" 바텀시트)
   C안 = 상담실형 + 비교형 / D안 = 직원 동반형 + 갈림길형(시작 3갈래, 화면마다 직원 대본 한 줄)
   상품, 가격, 장바구니, QR은 B안 것을 그대로 씀. 제품은 사진, 나머지는 이모지. 백업: flow_cd_백업_1113카닥전.js */
(function () {
  const MODE = window.FLOW_MODE || "C";
  const $f = (id) => document.getElementById(id);
  const TASTE_G = { 과일: "과일", 음료: "디저트·음료", 멘솔: "멘솔·민트", 담배: "시가·타바코" };
  const Q = [
    { k: "now", t: "지금 무엇을\n피우고 계세요?", say: "지금 어떤 담배 피우세요?", a: [["🚬", "연초", "일반 담배"], ["🔥", "궐련형", "아이코스, 릴 등"], ["💨", "전자담배", "써 본 적 있어요"], ["🌱", "처음이에요", "아직 안 피워요"]] },
    { k: "amount", t: "하루에 얼마나\n피우세요?", say: "하루에 얼마나 피우세요?", a: [["🙂", "적게", "반 갑 이하"], ["😐", "보통", "반 갑에서 한 갑"], ["😮‍💨", "많이", "한 갑 넘게"]] },
    { k: "draw", t: "어떻게 피우는 게\n좋으세요?", say: "담배처럼 입으로 빠세요, 아니면 연기 많이 폐로 바로 넘기세요?", help: "draw", a: [["👄", "담배처럼", "입에 머금었다 넘겨요 (입호흡)"], ["☁️", "연기 많이", "폐로 바로 깊게 (폐호흡)"]] },
    { k: "taste", t: "어떤 맛이\n좋으세요?", say: "좋아하시는 맛 하나만 골라 주세요", a: [["🍇", "과일", "포도, 자두, 사과"], ["🥤", "음료", "소다, 디저트"], ["🌿", "멘솔", "시원한 민트"], ["🍂", "담배", "연초 같은 맛"]] },
  ];
  const HELP = {
    draw: ["입호흡? 폐호흡? 알아보기", [["👄 입호흡", "담배처럼 입에 머금었다가 넘겨요. 처음 바꾸시는 분께 맞아요."], ["☁️ 폐호흡", "연기를 폐로 바로 깊게 들이마셔요. 연기가 많고 맛이 진해요."]]],
    ev: ["패키지? 이벤트? 알아보기", [["🧴 액상 5병", "맛 섞어서 49,500원 (병당 9,900원)"], ["🧴 액상 10+1 (11병)", "90,000원 (병당 약 8,200원)"], ["🎁 기기 살 때 액상 10병", "75,000원, 기기값은 따로"], ["🎁 기기 살 때 액상 5병", "40,000원, 기기값은 따로"]]],
    pod: ["팟은 왜 같이 사요?", [["🧩 팟", "액상이 들어가는 통이에요. 안에 코일이 있어요."], ["🔁 바꾸는 때", "액상 1병에 1개, 또는 7~8일에 한 번 바꿔요."], ["⚠️ 안 바꾸면", "맛이 탁해지고 샐 수 있어요."]]],
  };
  const F = { step: "start", ans: {}, sel: null, model: null, opt: null, mcol: "블랙", need: 10, back: [] };
  const won2 = (n) => (n || 0).toLocaleString() + "원";
  const lungMode = () => F.ans.draw === "연기 많이" && F.model === "하복2";

  // ── 기기 고르기 규칙 ──
  const hasDev = (m) => !!m && devOpts(m).length > 0;
  function pickModel() {
    const a = F.ans;
    if (a.draw === "연기 많이" && hasDev("하복2")) return "하복2";
    const pref = a.amount === "적게" ? ["말론S", "말론 기계"] : ["말론 기계", "말론S"];
    return pref.find(hasDev) || devModels().find(hasDev) || null;
  }
  const devName = (m) => m === "말론 기계" ? "말론" : m;
  function reasonOf(m) {
    const a = F.ans, who = { 연초: "연초", 궐련형: "궐련형", 전자담배: "전자담배", 처음이에요: "" }[a.now] || "";
    const amt = { 적게: "하루 반 갑 이하", 보통: "하루 반 갑에서 한 갑", 많이: "하루 한 갑 넘게" }[a.amount] || "";
    if (m === "하복2") return "연기를 많이 들이마시는 걸 좋아하셔서, 입호흡과 폐호흡 둘 다 되는 하복2를 골랐어요.";
    if (m === "말론S") return `${who ? who + " " : ""}${amt}면 작고 가벼운 말론S로 충분해요. 주머니에 쏙 들어가요.`;
    return `${who ? who + " " : ""}${amt}면 배터리가 넉넉한 말론이 편해요. 하루 종일 써도 돼요.`;
  }
  const optsOf = (m) => devOpts(m);
  const curOpt = () => { const o = optsOf(F.model); return o.find((x) => x.opt === F.opt) || o[0]; };
  const devImg = (m, opt) => m === "말론 기계" ? devImgOf("말론", F.mcol) : devImgOf(m, opt);

  // ── 모양 (카닥 방식) ──
  const css = document.createElement("style");
  css.textContent = `
  #flow{--ink:#191919;--g:#8B8B8B;--row:#F4F4F6;--red:#D81F2A;position:fixed;inset:0;z-index:50;background:#fff;display:flex;flex-direction:column;color:var(--ink);font-family:inherit}
  #flow[hidden]{display:none}
  .fl-top{display:flex;align-items:center;justify-content:space-between;padding:18px 20px 0;height:72px}
  .fl-top button{width:56px;height:56px;border-radius:28px;font-size:30px;color:var(--ink);background:transparent;display:flex;align-items:center;justify-content:center}
  .fl-top button[hidden]{visibility:hidden;display:flex}
  .fl-bar{height:4px;background:var(--row);margin:6px 28px 0}.fl-bar i{display:block;height:100%;background:var(--red);transition:width .3s}
  .fl-body{flex:1;overflow-y:auto;padding:24px 28px 24px}
  .fl-say{font-size:18px;color:var(--g);margin:0 0 10px}
  .fl-q{font-size:36px;font-weight:800;line-height:1.3;margin:0 0 10px;letter-spacing:-.03em;white-space:pre-line}
  .fl-help{display:inline-flex;align-items:center;gap:6px;font-size:19px;color:var(--g);margin:0 0 26px;padding:4px 0;background:none}.fl-help b{color:#1f6fe0;font-weight:700}
  .fl-sub{font-size:19px;color:var(--g);margin:0 0 22px;line-height:1.5}
  .fl-list{display:flex;flex-direction:column;gap:12px}
  .fl-row{display:flex;align-items:center;gap:16px;min-height:96px;padding:0 22px;border-radius:18px;background:var(--row);text-align:left;color:var(--ink);border:2px solid transparent;width:100%}
  .fl-row .e{font-size:36px;width:44px;text-align:center}.fl-row .t{flex:1}.fl-row b{display:block;font-size:26px;font-weight:700}.fl-row small{display:block;font-size:17px;color:var(--g);margin-top:2px}
  .fl-row .ck{width:34px;height:34px;border-radius:17px;border:2px solid #c9c9cf;display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px;font-weight:900}
  .fl-row.on{background:#fff;border-color:var(--ink)}.fl-row.on .ck{background:var(--red);border-color:var(--red)}
  .fl-foot{padding:14px 28px 26px}.fl-foot[hidden]{display:none}
  .fl-cta{display:block;width:100%;height:80px;border-radius:18px;background:var(--ink);color:#fff;font-size:24px;font-weight:800}
  .fl-cta:disabled{background:#d6d6db;color:#fff}
  .fl-cta.red{background:var(--red)}
  .fl-link{display:block;width:100%;margin-top:12px;font-size:20px;color:var(--g);text-decoration:underline;background:none;padding:8px}
  .fl-start h1{font-size:42px;line-height:1.3;margin:40px 0 12px;letter-spacing:-.03em;white-space:pre-line}.fl-start p{font-size:20px;color:var(--g);margin:0 0 34px}
  .fl-go{display:flex;align-items:center;gap:20px;width:100%;min-height:140px;margin-bottom:14px;padding:0 28px;border-radius:22px;background:#fff;border:1.5px solid #e6e6ea;text-align:left;color:var(--ink);box-shadow:0 2px 10px rgba(0,0,0,.04)}
  .fl-go .t{flex:1}.fl-go b{display:block;font-size:28px}.fl-go small{display:block;font-size:18px;color:var(--g);margin-top:4px}.fl-go .e{font-size:48px}.fl-go .ar{font-size:26px;color:#c9c9cf}
  .fl-go.main{border-color:var(--ink);border-width:2.5px}
  .fl-photo{background:var(--row);border-radius:22px;height:400px;display:flex;align-items:center;justify-content:center;margin:0 0 20px}.fl-photo img{max-height:360px;max-width:80%;object-fit:contain}
  .fl-name{font-size:34px;font-weight:800;margin:0 0 8px}.fl-why{font-size:22px;line-height:1.55;margin:0 0 18px}
  .fl-chips{display:flex;gap:10px;flex-wrap:wrap;margin:0 0 18px}.fl-chips button{height:52px;padding:0 22px;border-radius:26px;background:var(--row);font-size:19px;font-weight:700;color:var(--ink);border:2px solid transparent}.fl-chips button.on{background:#fff;border-color:var(--ink)}
  .fl-cmpbox{border-top:1px solid #ececf0;padding-top:16px}
  .fl-cline{display:flex;justify-content:space-between;align-items:baseline;font-size:20px;padding:6px 0}.fl-cline s{color:var(--g)}.fl-cline b{font-size:24px}.fl-cline em{font-style:normal;color:var(--red);font-weight:800;font-size:18px;margin-left:8px}
  .fl-cmp{display:grid;gap:12px;margin-bottom:10px}.fl-cmp .h{text-align:center;padding:14px 8px;border-radius:18px;background:var(--row);border:2px solid transparent}.fl-cmp .h.rec{border-color:var(--red);background:#fff}
  .fl-cmp img{width:100%;height:150px;object-fit:contain}.fl-cmp h4{font-size:23px;margin:6px 0 10px}.fl-cmp .h small{display:inline-block;font-size:14px;color:#fff;background:var(--red);border-radius:8px;padding:2px 8px;margin-bottom:4px}
  .fl-cmp .pick{width:100%;height:56px;border-radius:14px;background:var(--ink);color:#fff;font-size:19px;font-weight:800}
  .fl-tbl{width:100%;border-collapse:collapse;font-size:20px}.fl-tbl th{font-size:16px;color:var(--g);font-weight:600;text-align:left;padding:14px 0 4px}.fl-tbl td{padding:4px 0 14px;border-bottom:1px solid #ececf0;font-weight:700;text-align:center;width:33%}
  .fl-prog{position:sticky;top:-24px;z-index:2;background:#fff;padding:6px 0 12px;font-size:24px;font-weight:800}.fl-prog small{font-size:18px;color:var(--g);font-weight:600;margin-left:10px}
  .fl-pbar{height:8px;border-radius:4px;background:var(--row);overflow:hidden;margin-top:8px}.fl-pbar i{display:block;height:100%;background:var(--red)}
  .fl-need{display:flex;gap:10px;margin:4px 0 16px}
  .fl-lq{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
  .fl-lq button{position:relative;background:#fff;color:var(--ink);border-radius:18px;padding:10px 10px 14px;text-align:center;border:2px solid #ececf0}
  .fl-lq button.on{border-color:var(--ink)}.fl-lq img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:12px}
  .fl-lq b{display:block;font-size:18px;margin-top:8px}.fl-lq span{font-size:15px;color:var(--g)}
  .fl-lq em{position:absolute;top:8px;right:8px;min-width:34px;height:34px;border-radius:17px;background:var(--red);color:#fff;font-style:normal;font-weight:800;font-size:18px;line-height:34px}
  .fl-lq i{position:absolute;top:8px;left:8px;width:34px;height:34px;border-radius:17px;background:var(--ink);color:#fff;font-style:normal;font-weight:800;font-size:22px;line-height:32px}
  .fl-sum .r{display:flex;justify-content:space-between;font-size:21px;padding:14px 0;border-bottom:1px solid #ececf0}
  .fl-total{display:flex;justify-content:space-between;align-items:baseline;margin-top:18px}.fl-total span{font-size:22px;color:var(--g)}.fl-total b{font-size:36px}
  .fl-saved{font-size:21px;color:var(--red);font-weight:800;text-align:right;margin-top:6px}
  .fl-sheet{position:fixed;inset:0;z-index:60;background:rgba(0,0,0,.4);display:flex;align-items:flex-end}.fl-sheet[hidden]{display:none}
  .fl-sheet .in{width:100%;background:#fff;border-radius:28px 28px 0 0;padding:28px 28px 34px}.fl-sheet h3{font-size:26px;margin:0 0 16px}
  .fl-sheet .it{background:var(--row);border-radius:16px;padding:18px 20px;margin-bottom:10px}.fl-sheet .it b{display:block;font-size:21px}.fl-sheet .it span{font-size:18px;color:#3a3a3c;line-height:1.5}
  #flowBtn{position:fixed;left:16px;bottom:100px;z-index:12;height:60px;padding:0 24px;border-radius:30px;background:#191919;color:#fff;font-size:20px;font-weight:800;box-shadow:0 4px 14px rgba(0,0,0,.25)}
  body.land #flowBtn{bottom:20px}
  `;
  document.head.appendChild(css);
  const root = document.createElement("div"); root.id = "flow";
  root.innerHTML = `<div class="fl-top"><button id="flBack" aria-label="이전">←</button><button id="flHome" aria-label="처음으로">✕</button></div><div class="fl-bar"><i id="flBar"></i></div><div class="fl-body" id="flBody"></div><div class="fl-foot" id="flFoot"></div><div class="fl-sheet" id="flSheet" hidden><div class="in" id="flSheetIn"></div></div>`;
  document.body.appendChild(root);
  const btn = document.createElement("button"); btn.id = "flowBtn"; btn.textContent = "🙋 상담 시작"; document.body.appendChild(btn);

  const SAY = (t) => MODE === "D" && t ? `<div class="fl-say">🗣️ 직원: "${esc(t)}"</div>` : "";
  const HELPBTN = (k) => HELP[k] ? `<button class="fl-help" data-help="${k}">ⓘ <b>${esc(HELP[k][0])}</b></button>` : "";
  const ROW = (attr, on, e, t, s) => `<button class="fl-row ${on ? "on" : ""}" ${attr}><span class="e">${e}</span><span class="t"><b>${esc(t)}</b>${s ? `<small>${esc(s)}</small>` : ""}</span><span class="ck">${on ? "✓" : ""}</span></button>`;
  const STEPS = ["now", "amount", "draw", "taste", "rx", "liq", "pod", "done"];
  function chrome() { const i = STEPS.indexOf(F.step === "cmp" ? "rx" : F.step); $f("flBar").style.width = i < 0 ? "0%" : Math.round((i + 1) / STEPS.length * 100) + "%"; $f("flBack").hidden = !F.back.length; }
  const foot = (h) => { $f("flFoot").innerHTML = h || ""; $f("flFoot").hidden = !h; };
  function go2(step) { if (F.step !== step) F.back.push(F.step); F.step = step; F.sel = null; draw(); $f("flBody").scrollTop = 0; }

  function draw() {
    chrome(); const B = $f("flBody");
    if (F.step === "start") {
      const items = MODE === "D"
        ? [["first", "🙋", "처음 왔어요", "1분이면 맞는 걸 찾아 드려요", "main"], ["find", "🔍", "찾는 게 있어요", "맛이나 이름으로 바로 찾기", ""], ["change", "🔄", "기기 바꾸러 왔어요", "기기를 나란히 비교해요", ""]]
        : [["first", "🙋", "처음 왔어요", "질문 4개, 1분이면 끝나요", "main"], ["change", "🆚", "기기 비교해 볼래요", "배터리, 크기, 가격을 나란히", ""], ["browse", "👀", "그냥 둘러볼게요", "상품 화면으로 가요", ""]];
      B.innerHTML = `<div class="fl-start">${SAY("처음 오셨어요? 어떤 거 찾으세요?")}<h1>어서 오세요 👋\n어떻게 도와드릴까요?</h1><p>베이프렌드에서 맞는 전자담배를 같이 찾아 드려요</p>${items.map(([k, e, t, s, c]) => `<button class="fl-go ${c}" data-start="${k}"><span class="e">${e}</span><span class="t"><b>${t}</b><small>${s}</small></span><span class="ar">›</span></button>`).join("")}</div>`;
      foot(""); return; }
    const qi = Q.findIndex((q) => q.k === F.step);
    if (qi >= 0) { const q = Q[qi], cur = F.sel ?? F.ans[q.k];
      B.innerHTML = `${SAY(q.say)}<div class="fl-q">${esc(q.t)}</div>${HELPBTN(q.help) || `<div class="fl-sub">질문 ${qi + 1} / ${Q.length}</div>`}<div class="fl-list">${q.a.map(([e, t, s]) => ROW(`data-ans="${q.k}|${esc(t)}"`, cur === t, e, t, s)).join("")}</div>`;
      foot(`<button class="fl-cta" data-fl="next" ${cur ? "" : "disabled"}>다음</button>`); return; }
    if (F.step === "rx") { const m = F.model; if (!m) { B.innerHTML = `<div class="fl-q">😥 이 매장에 맞는 기기가\n지금 없어요</div><div class="fl-sub">직원에게 말씀해 주세요</div>`; foot(""); return; }
      const o = curOpt(), price = o ? o.price : 0, cols = m === "말론 기계" ? ["블랙", "건메탈", "실버"] : optsOf(m).map((x) => x.opt).filter(Boolean), curCol = m === "말론 기계" ? F.mcol : F.opt;
      const sep10 = price + 150000, pk10 = price + ADD.pr10, sep5 = price + 75000, pk5 = price + ADD.pr5;
      const save = lungMode()
        ? `<div class="fl-cline"><span>☁️ 프리미엄 폐호흡 액상</span><b>3병 40,000원</b></div>`
        : `<div class="fl-cline"><span>🎁 ${esc(devName(m))} + 액상 10병</span><span><s>${won2(sep10)}</s> <b>${won2(pk10)}</b><em>${won2(sep10 - pk10)} 아낌</em></span></div><div class="fl-cline"><span>🎁 ${esc(devName(m))} + 액상 5병</span><span><s>${won2(sep5)}</s> <b>${won2(pk5)}</b></span></div>`;
      B.innerHTML = `${SAY("이 기기가 손님께 맞을 거예요. 이유 읽어 드릴게요")}<div class="fl-q">손님께 맞는 기기는\n이거예요 ✨</div>${HELPBTN("ev")}
        <div class="fl-photo"><img src="${devImg(m, F.opt)}" alt=""></div><div class="fl-name">${esc(devName(m))}</div><div class="fl-why">${esc(reasonOf(m))}</div>
        ${cols.length > 1 ? `<div class="fl-chips">${cols.map((c) => `<button class="${curCol === c ? "on" : ""}" data-col="${esc(c)}">${esc(c)}</button>`).join("")}</div>${m === "말론 기계" ? `<div class="fl-sub" style="margin-top:-8px">색상별 재고는 직원이 확인해요</div>` : ""}` : ""}
        <div class="fl-cmpbox">${save}</div>`;
      foot(`<button class="fl-cta red" data-fl="takeDev">이걸로 할게요</button><button class="fl-link" data-fl="cmp">🆚 다른 기기와 비교해 볼래요</button>`); return; }
    if (F.step === "cmp") { const rec = F.model, list = [...new Set([rec, ...devModels()])].filter(hasDev).slice(0, 3);
      const ms = (k) => (MAIN_SPEC.find((r) => r[0] === k) || [])[1];
      const spec = (m) => { const d = devInfo(m) || {}, sz = DEVSIZE[d.n] || {}, o = optsOf(m)[0] || {}, h2 = m === "하복2";
        return { 가격: won2(o.price), "피우는 법": DEV_SUB[m] || (m.startsWith("말론") ? "입호흡" : ""), 배터리: h2 ? ms("배터리") : d.b, "팟 용량": h2 ? ms("카트리지") : (d.f || "").replace(/^.*\/\s*/, ""), 무게: h2 ? ms("무게") : sz.w ? sz.w + "g" : "", 크기: h2 ? ms("크기") : sz.size || "" }; };
      const EMO = { 가격: "💰", "피우는 법": "💨", 배터리: "🔋", "팟 용량": "💧", 무게: "⚖️", 크기: "📏" }, S = list.map(spec), keys = Object.keys(EMO).filter((k) => S.some((x) => x[k]));
      B.innerHTML = `${SAY("세 개 나란히 보시고 마음에 드는 걸로 골라 주세요")}<div class="fl-q">기기를 나란히\n비교해 보세요 🆚</div><div class="fl-sub">빨간 테두리가 손님께 추천하는 기기예요</div>
        <div class="fl-cmp" style="grid-template-columns:repeat(${list.length},1fr)">${list.map((m) => { const o = optsOf(m)[0] || {}; return `<div class="h ${m === rec ? "rec" : ""}">${m === rec ? "<small>추천</small>" : '<small style="visibility:hidden">추천</small>'}<img src="${devImg(m, o.opt)}" alt=""><h4>${esc(devName(m))}</h4><button class="pick" data-pick="${esc(m)}">이걸로</button></div>`; }).join("")}</div>
        <table class="fl-tbl">${keys.map((k) => `<tr><th colspan="${list.length}">${EMO[k]} ${k}</th></tr><tr>${S.map((x) => `<td>${esc(x[k] || "-")}</td>`).join("")}</tr>`).join("")}</table>`;
      foot(""); return; }
    if (F.step === "liq" && lungMode()) { const picked = [...cart.values()].filter((x) => x.k === "lung").reduce((a, x) => a + x.qty, 0), left = (3 - picked % 3) % 3;
      const pool = [...LUNG].filter((x) => !outOf(x.n)).sort((a, b) => (LUNG_BEST.findIndex((re) => re.test(a.n)) + 1 || 99) - (LUNG_BEST.findIndex((re) => re.test(b.n)) + 1 || 99)).slice(0, 12);
      B.innerHTML = `${SAY("폐호흡 액상은 세 병에 4만 원이에요. 섞어서 고르셔도 돼요")}<div class="fl-prog">☁️ ${picked}병 골랐어요<small>${picked && !left ? "3병 40,000원 적용 👍" : `${left || 3}병 더 고르면 3병 40,000원`}</small></div>
        <div class="fl-lq">${pool.map((x) => { const q = (cart.get(x.id) || {}).qty || 0, nm = x.n.replace(/\s*\(?모드\)?$/, ""); return `<button class="${q ? "on" : ""}" data-lq="${x.id}">${q ? `<em>${q}</em><i data-lqm="${x.id}">−</i>` : ""}${LUNG_IMG[x.n] ? `<img src="${LUNG_IMG[x.n]}" alt="">` : `<div style="aspect-ratio:1;border-radius:12px;background:#F4F4F6;display:flex;align-items:center;justify-content:center;font-size:44px">☁️</div>`}<b>${esc(nm)}</b><span>폐호흡</span></button>`; }).join("")}</div>`;
      foot(`<button class="fl-cta" data-fl="toPod" ${picked ? "" : "disabled"}>다음</button>`); return; }
    if (F.step === "liq") { const g = TASTE_G[F.ans.taste], picked = [...cart.values()].filter((x) => x.k === "liq").reduce((a, x) => a + x.qty, 0), left = Math.max(0, F.need - picked);
      const pool = [...LQ, ...ALL_LQ.filter((x) => !LQ.includes(x))].filter((x) => !outOf(x.n) && x.line !== "프라임" && (!g || x.g === g) && !((x.t || []).includes("무니코틴"))).slice(0, 12);
      B.innerHTML = `${SAY("이벤트라 맛 섞어서 고르셔도 돼요. 마음에 드는 거 눌러 주세요")}<div class="fl-prog">🧴 ${picked} / ${F.need}병<small>${left ? `${left}병 더 고르면 패키지 가격` : "다 골랐어요 👍"}</small><div class="fl-pbar"><i style="width:${Math.min(100, picked / F.need * 100)}%"></i></div></div>
        <div class="fl-need fl-chips">${[[10, `10병 ${won2(ADD.pr10)}`], [5, `5병 ${won2(ADD.pr5)}`]].map(([n, t]) => `<button class="${F.need === n ? "on" : ""}" data-need="${n}">${t}</button>`).join("")}</div>
        <div class="fl-lq">${pool.map((x) => { const q = (cart.get(x.id) || {}).qty || 0; return `<button class="${q ? "on" : ""}" data-lq="${x.id}">${q ? `<em>${q}</em><i data-lqm="${x.id}">−</i>` : ""}<img src="${imgOf(x)}" alt=""><b>${esc(short(x.n))}</b><span>${esc(x.f || "")}</span></button>`; }).join("")}</div>
        <div class="fl-sub" style="margin-top:16px">찾는 맛이 없으면 직원에게 말씀해 주세요 🙂</div>`;
      foot(`<button class="fl-cta" data-fl="toPod" ${picked ? "" : "disabled"}>${left && picked ? `${picked}병으로 다음` : "다음"}</button>`); return; }
    if (F.step === "pod") { const pod = podOf(), packs = lungMode() ? 2 : F.need === 10 ? 4 : 2, has = pod && (cart.get(pod.id) || {}).qty, sel = F.sel ?? (has ? "yes" : null);
      B.innerHTML = `${SAY("팟은 액상 한 병에 하나씩 바꾸셔야 해요. 같이 챙겨 드릴까요?")}<div class="fl-q">팟도 같이\n챙겨 드릴까요?</div>${HELPBTN("pod")}
        <div class="fl-list">${pod ? ROW('data-podsel="yes"', sel === "yes", "🧩", `${pod.n} ${packs}팩`, `+${won2(pod.price * POD_PER_PACK * packs)}${/0\.4/.test(pod.n) ? ", 맛 표현이 제일 좋아요" : ""}`) : ""}${ROW('data-podsel="no"', sel === "no", "⏭️", "나중에 살게요", "지금은 안 담아요")}</div>`;
      foot(`<button class="fl-cta" data-fl="toDone" ${sel ? "" : "disabled"}>다음</button>`); return; }
    if (F.step === "done") { const t = totalOf(), items = [...cart.values()], unitAll = items.reduce((a, x) => a + (x.unit || 0) * x.qty, 0), off = Math.max(0, unitAll - t.total);
      B.innerHTML = `${SAY("이렇게 담으셨어요. 확인해 주시면 계산 도와드릴게요")}<div class="fl-q">이렇게\n담았어요 🛍️</div>
        <div class="fl-sum">${items.map((x) => `<div class="r"><span>${esc(short(x.label || x.n).replace("말론 기계", "말론"))} × ${x.qty}</span><span>${won2(x.unit * x.qty)}</span></div>`).join("")}</div>
        <div class="fl-total"><span>합계</span><b>${won2(t.total)}</b></div>${off ? `<div class="fl-saved">🎉 패키지로 ${won2(off)} 아꼈어요</div>` : ""}
        <div class="fl-sub" style="margin-top:22px">처음 오셨으면 다음 화면에서 회원등록을 하시면 AS 받을 때 편해요</div>`;
      foot(`<button class="fl-cta red" data-fl="finish">👍 직원에게 보여 주기</button>`); return; }
  }
  function podOf() { const m = F.model; if (m === "말론S") return malPodOf("S", "0.4") || malPodOf("S", "0.6"); if (m === "말론 기계") return malPodOf("M", "0.4") || malPodOf("M", "0.6"); if (m === "하복2") return F.ans.draw === "연기 많이" ? qzPod("0.15") || qzPod("0.6") : qzPod("0.6"); return null; }
  function addDev() { const m = F.model, o = curOpt(); if (!o || [...cart.values()].some((x) => x.k === "dev")) return;
    addItem(o.id, { k: "dev", n: o.n, label: m === "말론 기계" ? o.n + ` (${F.mcol})` : o.n, img: devImg(m, o.opt), unit: o.price, model: m }); }
  function help(k) { const h = HELP[k]; if (!h) return; $f("flSheetIn").innerHTML = `<h3>${esc(h[0])}</h3>${h[1].map(([t, s]) => `<div class="it"><b>${esc(t)}</b><span>${esc(s)}</span></div>`).join("")}<button class="fl-cta" data-sheetx="1" style="margin-top:8px">알겠어요</button>`; $f("flSheet").hidden = false; }
  function open(step = "start") { F.back = []; F.step = step; F.sel = null; root.hidden = false; btn.hidden = true; draw(); }
  function close() { root.hidden = true; btn.hidden = false; }

  root.addEventListener("click", (e) => { const t = e.target;
    if (t.closest("[data-sheetx]") || t.id === "flSheet") { $f("flSheet").hidden = true; return; }
    const hp = t.closest("[data-help]"); if (hp) return help(hp.dataset.help);
    const st = t.closest("[data-start]"); if (st) { const k = st.dataset.start; F.ans = {};
      if (k === "first") return go2("now");
      if (k === "change") { F.model = devModels().find(hasDev) || null; F.opt = (optsOf(F.model)[0] || {}).opt; return go2("cmp"); }
      if (k === "find") { close(); setTimeout(() => $f("q").focus(), 50); return; } close(); go("home"); return; }
    const an = t.closest("[data-ans]"); if (an) { F.sel = an.dataset.ans.split("|")[1]; return draw(); }
    const col = t.closest("[data-col]"); if (col) { if (F.model === "말론 기계") F.mcol = col.dataset.col; else F.opt = col.dataset.col; return draw(); }
    const pk = t.closest("[data-pick]"); if (pk) { F.model = pk.dataset.pick; F.opt = (optsOf(F.model)[0] || {}).opt || null; return go2("rx"); }
    const nd = t.closest("[data-need]"); if (nd) { F.need = +nd.dataset.need; return draw(); }
    const lm = t.closest("[data-lqm]"); if (lm) { const c = cart.get(lm.dataset.lqm); if (c) { if (c.qty > 1) c.qty--; else cart.delete(lm.dataset.lqm); drawCart(); } return draw(); }
    const lq = t.closest("[data-lq]"); if (lq) { const x = ALL_LQ.find((y) => y.id === lq.dataset.lq); if (x) addLiqX(x); else { const l = LUNG.find((y) => y.id === lq.dataset.lq); if (l) addGoods(l); } return draw(); }
    const ps = t.closest("[data-podsel]"); if (ps) { const pod = podOf(), want = ps.dataset.podsel === "yes"; F.sel = ps.dataset.podsel;
      if (pod) { if (want && !cart.get(pod.id)) addGoods(pod, POD_PER_PACK * (lungMode() ? 2 : F.need === 10 ? 4 : 2)); if (!want && cart.get(pod.id)) { cart.delete(pod.id); drawCart(); } } return draw(); }
    const b = t.closest("[data-fl]"); if (!b || b.disabled) return; const a = b.dataset.fl;
    if (a === "next") { const q = Q.find((x) => x.k === F.step), v = F.sel ?? F.ans[q.k]; if (!v) return; F.ans[q.k] = v; const i = Q.indexOf(q);
      if (i < Q.length - 1) return go2(Q[i + 1].k); F.model = pickModel(); F.opt = (optsOf(F.model)[0] || {}).opt || null; return go2("rx"); }
    if (a === "cmp") return go2("cmp");
    if (a === "takeDev") { addDev(); toast(devName(F.model) + " 담았어요"); return go2("liq"); }
    if (a === "toPod") return go2("pod");
    if (a === "toDone") return go2("done");
    if (a === "finish") { close(); drawCart(); document.body.classList.add("open"); return; }
  });
  $f("flBack").onclick = () => { if (!F.back.length) return; F.step = F.back.pop(); F.sel = null; draw(); };
  $f("flHome").onclick = () => { F.back = []; F.step = "start"; F.sel = null; draw(); };
  btn.onclick = () => open();
  // 60초 손 안 대면 처음 화면으로 (담은 상품은 그대로)
  let idle = 0; const poke = () => { clearTimeout(idle); idle = setTimeout(() => { if (!root.hidden && F.step !== "start") { $f("flSheet").hidden = true; F.back = []; F.step = "start"; F.sel = null; draw(); } }, 60e3); };
  ["pointerdown", "keydown"].forEach((ev) => addEventListener(ev, poke, true)); poke();
  window.flowOpen = open;
  setTimeout(() => open(), 300);
})();
