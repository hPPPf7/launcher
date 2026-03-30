import Link from "next/link";

const downloadUrl =
  "https://github.com/hPPPf7/launcher/releases/latest/download/HanBurger-Setup.exe";

export default function HomePage() {
  return (
    <main className="download-page">
      <section className="download-hero">
        <p className="eyebrow">HanBurger platform</p>
        <h1>HanBurger 桌面平台</h1>
        <p className="download-lede">
          這裡提供 HanBurger 桌面版下載，也會逐步整合帳號管理、平台登入與跨專案入口。
          目前桌面版仍以安裝與啟動器功能為主，帳號管理頁面先提供基本佔位。
        </p>

        <div className="download-actions">
          <a href={downloadUrl} className="primary-link">
            下載桌面版
          </a>
          <Link href="/desktop" className="secondary-button">
            查看桌面版說明
          </Link>
          <Link href="/account" className="secondary-button">
            帳號管理
          </Link>
        </div>
      </section>

      <section className="download-grid">
        <article className="download-card">
          <p className="eyebrow">目前用途</p>
          <ul className="download-list">
            <li>下載 HanBurger Launcher 安裝程式</li>
            <li>集中展示桌面端的入口與後續平台能力</li>
            <li>之後會接入共用登入與跨專案管理</li>
            <li>保留作為帳號管理中心的入口</li>
          </ul>
        </article>

        <article className="download-card">
          <p className="eyebrow">帳號管理</p>
          <ul className="download-list">
            <li>平台帳號刪除之後會集中到這裡處理</li>
            <li>各專案內只保留刪除該專案資料的操作</li>
            <li>未來會整合 Google 登入與桌面單點登入</li>
            <li>目前先提供帳號管理頁面佔位</li>
          </ul>
        </article>
      </section>
    </main>
  );
}
