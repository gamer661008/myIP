/**
 * Cloudflare Worker IP Lookup Platform
 * Single-file Deployment Architecture
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // API 端點：供前端切換查詢自訂 IP 或重新整理時請求 JSON 資料
    if (url.pathname === '/api/ip') {
      return handleApiRequest(request, url);
    }

    // 主頁面渲染 (SSR HTML)
    return handleHtmlRequest(request);
  }
};

/**
 * 處理 API 請求（支援自訂 IP 查詢與備援模式）
 */
async function handleApiRequest(request, url) {
  const targetIp = url.searchParams.get('ip');

  // 若使用者查詢特定 IP，調用外部 API (FreeIPAPI / IP-API)
  if (targetIp) {
    try {
      // 優先使用 FreeIPAPI
      const res = await fetch(`https://freeipapi.com/api/json/${encodeURIComponent(targetIp)}`);
      if (res.ok) {
        const data = await res.json();
        return new Response(JSON.stringify({
          ip: data.ipAddress || targetIp,
          country: data.countryName || 'Unknown',
          countryCode: data.countryCode || '',
          city: data.cityName || 'Unknown',
          region: data.regionName || 'Unknown',
          postalCode: data.zipCode || '-',
          latitude: data.latitude || 0,
          longitude: data.longitude || 0,
          timezone: data.timeZone || 'UTC',
          asn: data.asn ? `AS${data.asn}` : 'Unknown',
          isp: data.asnOrganization || 'Unknown',
          org: data.asnOrganization || 'Unknown',
          source: 'FreeIPAPI'
        }), { headers: { 'content-type': 'application/json;charset=UTF-8' } });
      }
    } catch (e) {
      // Fallback 到 ip-api.com
      try {
        const res = await fetch(`http://ip-api.com/json/${encodeURIComponent(targetIp)}?fields=status,message,country,countryCode,regionName,city,zip,lat,lon,timezone,isp,org,as,query`);
        if (res.ok) {
          const data = await res.json();
          return new Response(JSON.stringify({
            ip: data.query || targetIp,
            country: data.country || 'Unknown',
            countryCode: data.countryCode || '',
            city: data.city || 'Unknown',
            region: data.regionName || 'Unknown',
            postalCode: data.zip || '-',
            latitude: data.lat || 0,
            longitude: data.lon || 0,
            timezone: data.timezone || 'UTC',
            asn: data.as ? data.as.split(' ')[0] : 'Unknown',
            isp: data.isp || 'Unknown',
            org: data.org || 'Unknown',
            source: 'IP-API'
          }), { headers: { 'content-type': 'application/json;charset=UTF-8' } });
        }
      } catch (err) {
        return new Response(JSON.stringify({ error: 'Failed to query IP info' }), { status: 500 });
      }
    }
  }

  // 若無指定 IP，直接從 Cloudflare request 物件讀取原生邊緣節點數據
  const clientIp = request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip') || '127.0.0.1';
  const cf = request.cf || {};

  const payload = {
    ip: clientIp,
    country: cf.country || 'Unknown',
    countryCode: cf.country || '',
    city: cf.city || 'Unknown',
    region: cf.region || 'Unknown',
    postalCode: cf.postalCode || '-',
    latitude: cf.latitude || 0,
    longitude: cf.longitude || 0,
    timezone: cf.timezone || 'UTC',
    asn: cf.asn ? `AS${cf.asn}` : 'Unknown',
    isp: cf.asOrganization || 'Unknown',
    org: cf.asOrganization || 'Unknown',
    httpProtocol: request.cf?.httpProtocol || 'HTTP/2',
    tlsVersion: request.cf?.tlsVersion || 'TLS 1.3',
    colo: cf.colo || 'Unknown',
    source: 'Cloudflare Edge Native'
  };

  return new Response(JSON.stringify(payload), {
    headers: { 'content-type': 'application/json;charset=UTF-8', 'cache-control': 'no-cache' }
  });
}

/**
 * 渲染前端主 HTML 頁面
 */
function handleHtmlRequest(request) {
  const clientIp = request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip') || '127.0.0.1';
  const cf = request.cf || {};

  // 初期數據直噴渲染 (Initial SSR Hydration)
  const initialData = {
    ip: clientIp,
    country: cf.country || 'Unknown',
    countryCode: cf.country || '',
    city: cf.city || 'Unknown',
    region: cf.region || 'Unknown',
    postalCode: cf.postalCode || '-',
    latitude: cf.latitude || 0,
    longitude: cf.longitude || 0,
    timezone: cf.timezone || 'UTC',
    asn: cf.asn ? `AS${cf.asn}` : 'Unknown',
    isp: cf.asOrganization || 'Unknown',
    org: cf.asOrganization || 'Unknown',
    httpProtocol: cf.httpProtocol || 'HTTP/2',
    tlsVersion: cf.tlsVersion || 'TLS 1.3',
    colo: cf.colo || 'Unknown',
    source: 'Cloudflare Edge Native'
  };

  const html = `<!DOCTYPE html>
<html lang="zh-TW" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>極速 IP 檢測與網路診斷工具 | IP Analytics</title>
  <!-- Tailwind CSS CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            brand: { 50: '#f0f9ff', 500: '#06b6d4', 600: '#0891b2', 900: '#0e7490' }
          }
        }
      }
    }
  </script>
  <!-- FontAwesome Icons -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    .glass {
      background: rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
    }
    .dark .glass {
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
    }
  </style>
</head>
<body class="bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 min-h-screen flex flex-col transition-colors duration-300">

  <!-- Header / Navigation -->
  <header class="w-full border-b border-slate-200 dark:border-slate-800 glass sticky top-0 z-40">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
      <div class="flex items-center space-x-3">
        <div class="bg-brand-500 text-white p-2 rounded-xl shadow-lg shadow-brand-500/30">
          <i class="fa-solid fa-network-wired text-xl"></i>
        </div>
        <span class="font-bold text-xl tracking-tight bg-gradient-to-r from-brand-500 to-blue-600 bg-clip-text text-transparent">IP Analytics</span>
      </div>

      <div class="flex items-center space-x-3">
        <!-- 多國語言選擇器 -->
        <select id="langSelect" onchange="changeLanguage(this.value)" class="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm rounded-lg p-2 focus:ring-2 focus:ring-brand-500 outline-none">
          <option value="zh-TW">繁體中文</option>
          <option value="zh-CN">简体中文</option>
          <option value="en">English</option>
          <option value="ja">日本語</option>
        </select>

        <!-- 暗黑模式切換 -->
        <button onclick="toggleDarkMode()" class="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition">
          <i id="themeIcon" class="fa-solid fa-moon text-slate-600 dark:text-amber-400"></i>
        </button>
      </div>
    </div>
  </header>

  <!-- Main Content -->
  <main class="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

    <!-- 主 IP 展示大卡片 -->
    <div class="glass rounded-3xl p-6 sm:p-10 border border-slate-200/80 dark:border-slate-800 shadow-xl relative overflow-hidden">
      <div class="absolute -right-10 -bottom-10 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div class="flex flex-col lg:flex-row items-center justify-between gap-6 relative z-10">
        <div class="space-y-2 text-center lg:text-left">
          <div class="inline-flex items-center space-x-2 bg-brand-500/10 border border-brand-500/20 px-3 py-1 rounded-full text-brand-600 dark:text-brand-500 text-xs font-semibold">
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span data-i18n="detected_ip">當前連線 IP</span>
          </div>
          <h1 id="mainIpDisplay" class="text-3xl sm:text-5xl font-extrabold tracking-tight font-mono text-slate-900 dark:text-white">
            ${initialData.ip}
          </h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 flex items-center justify-center lg:justify-start gap-2">
            <i class="fa-solid fa-bolt text-amber-500"></i>
            <span data-i18n="data_source">資料來源</span>: <span id="dataSource" class="font-medium text-slate-700 dark:text-slate-300">${initialData.source}</span>
          </p>
        </div>

        <div class="flex flex-wrap gap-3 justify-center">
          <button onclick="copyIp()" class="flex items-center space-x-2 bg-brand-600 hover:bg-brand-500 text-white font-medium px-5 py-3 rounded-xl transition shadow-lg shadow-brand-600/30 active:scale-95">
            <i class="fa-solid fa-copy"></i>
            <span data-i18n="copy_btn">一鍵複製 IP</span>
          </button>
          <button onclick="fetchCurrentIp()" class="flex items-center space-x-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium px-5 py-3 rounded-xl transition active:scale-95">
            <i class="fa-solid fa-rotate text-sm" id="refreshIcon"></i>
            <span data-i18n="refresh_btn">重新整理</span>
          </button>
        </div>
      </div>

      <!-- 連線協議動態標籤 -->
      <div class="mt-8 pt-6 border-t border-slate-200/60 dark:border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div class="bg-slate-100/60 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200/50 dark:border-slate-800/50 text-center">
          <div class="text-xs text-slate-500" data-i18n="protocol">HTTP 協定</div>
          <div id="protocolVal" class="text-sm font-semibold mt-1 text-slate-800 dark:text-slate-200">${initialData.httpProtocol}</div>
        </div>
        <div class="bg-slate-100/60 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200/50 dark:border-slate-800/50 text-center">
          <div class="text-xs text-slate-500" data-i18n="tls_ver">TLS 加密</div>
          <div id="tlsVal" class="text-sm font-semibold mt-1 text-slate-800 dark:text-slate-200">${initialData.tlsVersion}</div>
        </div>
        <div class="bg-slate-100/60 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200/50 dark:border-slate-800/50 text-center">
          <div class="text-xs text-slate-500" data-i18n="edge_center">Cloudflare 節點</div>
          <div id="coloVal" class="text-sm font-semibold mt-1 text-brand-600 dark:text-brand-500">${initialData.colo}</div>
        </div>
        <div class="bg-slate-100/60 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200/50 dark:border-slate-800/50 text-center">
          <div class="text-xs text-slate-500" data-i18n="ip_type">協定類型</div>
          <div id="ipTypeVal" class="text-sm font-semibold mt-1 text-slate-800 dark:text-slate-200">${initialData.ip.includes(':') ? 'IPv6' : 'IPv4'}</div>
        </div>
      </div>
    </div>

    <!-- 自訂 IP 搜尋欄位 -->
    <div class="glass p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-3">
      <div class="relative flex-grow">
        <i class="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
        <input type="text" id="customIpInput" placeholder="例如：1.1.1.1 或 8.8.8.8" class="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-brand-500 outline-none transition text-sm">
      </div>
      <button onclick="queryCustomIp()" class="bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-medium px-6 py-3 rounded-xl transition text-sm whitespace-nowrap">
        <span data-i18n="query_btn">查詢指定 IP</span>
      </button>
    </div>

    <!-- 詳細資訊卡片網格 (Grid) -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

      <!-- 1. 地理位置卡片 -->
      <div class="glass p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
        <div class="flex items-center space-x-3 text-brand-500">
          <i class="fa-solid fa-earth-americas text-xl"></i>
          <h3 class="font-bold text-slate-900 dark:text-white" data-i18n="geo_info">地理位置資訊</h3>
        </div>
        <div class="space-y-3 text-sm">
          <div class="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
            <span class="text-slate-500" data-i18n="country">國家 / 地區</span>
            <span class="font-medium flex items-center gap-2" id="valCountry">
              <span id="flagIcon"></span>
              <span id="countryText">${initialData.country} (${initialData.countryCode})</span>
            </span>
          </div>
          <div class="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
            <span class="text-slate-500" data-i18n="city">城市 / 省份</span>
            <span class="font-medium" id="valCity">${initialData.city}, ${initialData.region}</span>
          </div>
          <div class="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
            <span class="text-slate-500" data-i18n="postal">郵遞區號</span>
            <span class="font-medium" id="valPostal">${initialData.postalCode}</span>
          </div>
        </div>
      </div>

      <!-- 2. 網路與 ISP 卡片 -->
      <div class="glass p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
        <div class="flex items-center space-x-3 text-brand-500">
          <i class="fa-solid fa-server text-xl"></i>
          <h3 class="font-bold text-slate-900 dark:text-white" data-i18n="network_info">網路服務供應商</h3>
        </div>
        <div class="space-y-3 text-sm">
          <div class="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
            <span class="text-slate-500" data-i18n="isp">ISP 業者</span>
            <span class="font-medium text-right max-w-[180px] truncate" id="valIsp" title="${initialData.isp}">${initialData.isp}</span>
          </div>
          <div class="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
            <span class="text-slate-500" data-i18n="asn">ASN 編號</span>
            <span class="font-medium" id="valAsn">${initialData.asn}</span>
          </div>
          <div class="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
            <span class="text-slate-500" data-i18n="org">組織名稱</span>
            <span class="font-medium text-right max-w-[180px] truncate" id="valOrg" title="${initialData.org}">${initialData.org}</span>
          </div>
        </div>
      </div>

      <!-- 3. 時間與座標卡片 -->
      <div class="glass p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
        <div class="flex items-center space-x-3 text-brand-500">
          <i class="fa-solid fa-clock-rotate-left text-xl"></i>
          <h3 class="font-bold text-slate-900 dark:text-white" data-i18n="time_geo">時間與地理座標</h3>
        </div>
        <div class="space-y-3 text-sm">
          <div class="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
            <span class="text-slate-500" data-i18n="timezone">時區</span>
            <span class="font-medium" id="valTimezone">${initialData.timezone}</span>
          </div>
          <div class="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
            <span class="text-slate-500" data-i18n="latitude">緯度 (Latitude)</span>
            <span class="font-medium" id="valLat">${initialData.latitude}</span>
          </div>
          <div class="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
            <span class="text-slate-500" data-i18n="longitude">經度 (Longitude)</span>
            <span class="font-medium" id="valLon">${initialData.longitude}</span>
          </div>
        </div>
      </div>

    </div>
  </main>

  <!-- Sticky Bottom Cookie Consent Banner -->
  <div id="cookieBanner" class="fixed bottom-0 left-0 w-full glass border-t border-slate-200 dark:border-slate-800 p-4 shadow-2xl z-50 transform transition-transform duration-300 translate-y-0">
    <div class="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div class="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-3">
        <i class="fa-solid fa-cookie-bite text-amber-500 text-xl flex-shrink-0"></i>
        <span data-i18n="cookie_msg">本網站使用 Cookie 與相關技術來改善您的瀏覽體驗與個人化內容投放。點擊「同意」即表示您允許我們讀取 Cookie 並加載相關服務。</span>
      </div>
      <div class="flex gap-3 flex-shrink-0 w-full sm:w-auto justify-end">
        <button onclick="acceptCookies()" class="bg-brand-600 hover:bg-brand-500 text-white font-medium text-xs px-5 py-2.5 rounded-xl transition">
          <span data-i18n="cookie_accept">同意並繼續</span>
        </button>
      </div>
    </div>
  </div>

  <!-- Toast Notification -->
  <div id="toast" class="fixed bottom-20 right-5 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 px-4 py-3 rounded-xl shadow-2xl text-sm flex items-center space-x-2 transition opacity-0 pointer-events-none z-50">
    <i class="fa-solid fa-circle-check text-emerald-400"></i>
    <span id="toastMsg">複製成功！</span>
  </div>

  <!-- JavaScript Client Logic -->
  <script>
    // 多語系字典
    const i18nDict = {
      'zh-TW': {
        detected_ip: '當前連線 IP',
        data_source: '資料來源',
        copy_btn: '一鍵複製 IP',
        refresh_btn: '重新整理',
        protocol: 'HTTP 協定',
        tls_ver: 'TLS 加密',
        edge_center: 'Cloudflare 節點',
        ip_type: '協定類型',
        query_btn: '查詢指定 IP',
        geo_info: '地理位置資訊',
        country: '國家 / 地區',
        city: '城市 / 省份',
        postal: '郵遞區號',
        network_info: '網路服務供應商',
        isp: 'ISP 業者',
        asn: 'ASN 編號',
        org: '組織名稱',
        time_geo: '時間與地理座標',
        timezone: '時區',
        latitude: '緯度 (Latitude)',
        longitude: '經度 (Longitude)',
        cookie_msg: '本網站使用 Cookie 與相關技術來改善您的瀏覽體驗與個人化內容投放。點擊「同意」即表示您允許我們讀取 Cookie 並加載相關服務。',
        cookie_accept: '同意並繼續',
        copied: 'IP 地址已複製到剪貼簿！'
      },
      'zh-CN': {
        detected_ip: '当前连接 IP',
        data_source: '数据来源',
        copy_btn: '一键复制 IP',
        refresh_btn: '刷新页面',
        protocol: 'HTTP 协议',
        tls_ver: 'TLS 加密',
        edge_center: 'Cloudflare 节点',
        ip_type: '协议类型',
        query_btn: '查询指定 IP',
        geo_info: '地理位置信息',
        country: '国家 / 地区',
        city: '城市 / 省份',
        postal: '邮政编码',
        network_info: '网络服务供应商',
        isp: 'ISP 运营商',
        asn: 'ASN 编号',
        org: '组织名称',
        time_geo: '时间与地理坐标',
        timezone: '时区',
        latitude: '纬度 (Latitude)',
        longitude: '经度 (Longitude)',
        cookie_msg: '本网站使用 Cookie 及相关技术来改善您的浏览体验与个性化内容投放。点击“同意”即表示您允许我们读取 Cookie 并加载相关服务。',
        cookie_accept: '同意并继续',
        copied: 'IP 地址已复制到剪贴板！'
      },
      'en': {
        detected_ip: 'Connected IP',
        data_source: 'Data Source',
        copy_btn: 'Copy IP',
        refresh_btn: 'Refresh',
        protocol: 'Protocol',
        tls_ver: 'TLS Version',
        edge_center: 'Cloudflare Edge',
        ip_type: 'IP Version',
        query_btn: 'Lookup IP',
        geo_info: 'Geolocation Info',
        country: 'Country / Region',
        city: 'City / Region',
        postal: 'Postal Code',
        network_info: 'ISP & Network',
        isp: 'ISP Provider',
        asn: 'ASN Code',
        org: 'Organization',
        time_geo: 'Time & Coordinates',
        timezone: 'Timezone',
        latitude: 'Latitude',
        longitude: 'Longitude',
        cookie_msg: 'We use cookies and related technologies to enhance your browsing experience and serve personalized content. By clicking "Accept", you agree to our usage.',
        cookie_accept: 'Accept & Continue',
        copied: 'IP address copied to clipboard!'
      },
      'ja': {
        detected_ip: '現在の接続 IP',
        data_source: 'データソース',
        copy_btn: 'IPをコピー',
        refresh_btn: '更新',
        protocol: 'プロトコル',
        tls_ver: 'TLS 暗号化',
        edge_center: 'Cloudflare ノード',
        ip_type: 'IP タイプ',
        query_btn: 'IP 検索',
        geo_info: '位置情報',
        country: '国 / 地域',
        city: '都市 / 州',
        postal: '郵便番号',
        network_info: 'ネットワーク情報',
        isp: 'ISP プロバイダ',
        asn: 'ASN 番号',
        org: '組織',
        time_geo: '時間と地理座標',
        timezone: 'タイムゾーン',
        latitude: '緯度',
        longitude: '経度',
        cookie_msg: '当ウェブサイトでは、閲覧体験の向上およびパーソナライズされたコンテンツの提供のためにクッキーを使用しています。「同意する」をクリックすると使用を許可したことになります。',
        cookie_accept: '同意して続ける',
        copied: 'IPアドレスをクリップボードにコピーしました！'
      }
    };

    let currentLang = 'zh-TW';

    // 語系切換邏輯
    function changeLanguage(lang) {
      currentLang = lang;
      const dict = i18nDict[lang] || i18nDict['en'];
      document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[key]) el.textContent = dict[key];
      });
    }

    // 暗黑模式切換
    function toggleDarkMode() {
      const html = document.documentElement;
      const themeIcon = document.getElementById('themeIcon');
      if (html.classList.contains('dark')) {
        html.classList.remove('dark');
        themeIcon.className = 'fa-solid fa-sun text-amber-500';
      } else {
        html.classList.add('dark');
        themeIcon.className = 'fa-solid fa-moon text-amber-400';
      }
    }

    // 複製 IP
    function copyIp() {
      const ipText = document.getElementById('mainIpDisplay').innerText.trim();
      navigator.clipboard.writeText(ipText).then(() => {
        const dict = i18nDict[currentLang] || i18nDict['en'];
        showToast(dict.copied);
      });
    }

    function showToast(msg) {
      const toast = document.getElementById('toast');
      document.getElementById('toastMsg').textContent = msg;
      toast.classList.remove('opacity-0', 'pointer-events-none');
      setTimeout(() => {
        toast.classList.add('opacity-0', 'pointer-events-none');
      }, 3000);
    }

    // 更新 DOM 顯示數據
    function updateUiData(data) {
      document.getElementById('mainIpDisplay').innerText = data.ip;
      document.getElementById('dataSource').innerText = data.source || 'API Response';
      document.getElementById('countryText').innerText = \`\${data.country} (\${data.countryCode})\`;
      document.getElementById('valCity').innerText = \`\${data.city}, \${data.region}\`;
      document.getElementById('valPostal').innerText = data.postalCode || '-';
      document.getElementById('valIsp').innerText = data.isp || 'Unknown';
      document.getElementById('valAsn').innerText = data.asn || 'Unknown';
      document.getElementById('valOrg').innerText = data.org || 'Unknown';
      document.getElementById('valTimezone').innerText = data.timezone || 'UTC';
      document.getElementById('valLat').innerText = data.latitude || 0;
      document.getElementById('valLon').innerText = data.longitude || 0;
      document.getElementById('ipTypeVal').innerText = data.ip.includes(':') ? 'IPv6' : 'IPv4';
    }

    // 重新抓取當前用戶 IP
    async function fetchCurrentIp() {
      const icon = document.getElementById('refreshIcon');
      icon.classList.add('fa-spin');
      try {
        const res = await fetch('/api/ip');
        const data = await res.json();
        updateUiData(data);
      } catch (err) {
        showToast('無法取得更新資料');
      } finally {
        icon.classList.remove('fa-spin');
      }
    }

    // 查詢自訂 IP
    async function queryCustomIp() {
      const ip = document.getElementById('customIpInput').value.trim();
      if (!ip) return;

      try {
        const res = await fetch(\`/api/ip?ip=\${encodeURIComponent(ip)}\`);
        const data = await res.json();
        if (data.error) {
          showToast('查詢失敗，請輸入有效的 IP');
          return;
        }
        updateUiData(data);
      } catch (err) {
        showToast('查詢失敗，請重試');
      }
    }

    // Cookie 同意機制與廣告加載腳本
    function acceptCookies() {
      localStorage.setItem('cookie_consent', 'true');
      document.getElementById('cookieBanner').classList.add('translate-y-full');
      loadAdScripts();
    }

    // 加載廣告腳本(用戶同意Cookie後調用)
    function loadAdScripts() {
      console.log('Cookie consent granted. Initializing ad scripts...');

      // 示例 1: Google AdSense 代碼占位 - 替換 ca-pub-XXXXXXXXXXXXXXXX 為你的發布商ID
      /*
      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX';
      script.crossOrigin = 'anonymous';
      document.head.appendChild(script);
      */

      // 示例 2: 第三方廣告網路代碼占位
      const adScript = document.createElement('script');
      adScript.async = true;
      adScript.src = 'https://araplhn.org/4/71ac2cfb6393a198691c9b7ac60f81f2';
      document.head.appendChild(adScript);
    }

    // 頁面初始化檢查
    window.addEventListener('DOMContentLoaded', () => {
      // 檢查 Cookie 同意狀態
      if (localStorage.getItem('cookie_consent') === 'true') {
        document.getElementById('cookieBanner').classList.add('translate-y-full');
        loadAdScripts();
      }
    });
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'content-type': 'text/html;charset=UTF-8',
      'cache-control': 'public, max-age=0, must-revalidate'
    }
  });
}