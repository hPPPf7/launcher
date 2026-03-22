const downloadUrl =
  "https://github.com/hPPPf7/launcher/releases/latest/download/HanBurger-Setup.exe";

export default function HomePage() {
  return (
    <main className="download-page">
      <section className="download-hero">
        <p className="eyebrow">HanBurger platform</p>
        <h1>下載 HanBurger 平台</h1>
        <p className="download-lede">
          先安裝 HanBurger，再從平台裡管理與啟動各個 app。下載按鈕會指向
          GitHub Releases 上最新的 Windows 安裝程式。
        </p>

        <div className="download-actions">
          <a href={downloadUrl} className="primary-link">
            下載平台
          </a>
          <a href="/desktop" className="secondary-button">
            預覽平台畫面
          </a>
        </div>
      </section>

      <section className="download-grid">
        <article className="download-card">
          <p className="eyebrow">目前內容</p>
          <ul className="download-list">
            <li>獨立的 HanBurger 平台 repo</li>
            <li>左側 app 切換欄</li>
            <li>可連接外部 Watch app</li>
            <li>本機資料夾骨架</li>
          </ul>
        </article>

        <article className="download-card">
          <p className="eyebrow">之後會改進</p>
          <ul className="download-list">
            <li>正式 Windows 安裝程式</li>
            <li>平台內安裝與移除 app</li>
            <li>本機安裝狀態與快取管理</li>
            <li>更新與版本檢查</li>
          </ul>
        </article>
      </section>
    </main>
  );
}
