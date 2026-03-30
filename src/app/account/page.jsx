import Link from "next/link";

export default function AccountPage() {
  return (
    <main className="download-page">
      <section className="download-hero">
        <p className="eyebrow">HanBurger account</p>
        <h1>帳號管理</h1>
        <p className="download-lede">
          這裡會作為 HanBurger 的共用帳號管理入口。之後可在此管理整個平台帳號、跨專案設定、
          以及桌面版下載與登入整合。現在先保留版位，讓各專案能導向同一個管理位置。
        </p>

        <div className="download-actions">
          <Link href="/" className="secondary-button">
            回到首頁
          </Link>
          <Link href="/desktop" className="secondary-button">
            查看桌面版說明
          </Link>
        </div>
      </section>

      <section className="download-grid">
        <article className="download-card">
          <p className="eyebrow">預計整合</p>
          <ul className="download-list">
            <li>整個 HanBurger 帳戶的刪除與重建流程</li>
            <li>平台共用登入狀態與裝置管理</li>
            <li>各專案的資料與權限概覽</li>
          </ul>
        </article>

        <article className="download-card">
          <p className="eyebrow">目前狀態</p>
          <ul className="download-list">
            <li>Watch 會先導向這個頁面處理整個平台帳號管理</li>
            <li>各專案內僅保留刪除自己資料的功能</li>
            <li>完整帳號中心與單點登入之後再實作</li>
          </ul>
        </article>
      </section>
    </main>
  );
}
