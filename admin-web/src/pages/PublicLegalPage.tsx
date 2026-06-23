import { BrandLockup } from "../components/Brand";
import { PUBLIC_LEGAL_CONTENT, type PublicLegalRoute } from "./publicLegalContent";

type PublicLegalPageProps = {
  route: PublicLegalRoute;
};

const sectionLinks: Record<PublicLegalRoute, { href: string; label: string }[]> = {
  privacy: [
    { href: "/privacy", label: "Privacy Policy" },
    { href: "/terms", label: "Terms of Service" },
  ],
  terms: [
    { href: "/privacy", label: "Privacy Policy" },
    { href: "/terms", label: "Terms of Service" },
  ],
};

export function PublicLegalPage({ route }: PublicLegalPageProps) {
  const content = PUBLIC_LEGAL_CONTENT[route];

  return (
    <main className="public-legal-page">
      <div className="public-legal-shell">
        <header className="public-legal-header">
          <a className="public-legal-brand" href="/" aria-label="SOSync home">
            <BrandLockup compact />
          </a>

          <nav className="public-legal-nav" aria-label="Legal pages">
            {sectionLinks[route].map((item) => (
              <a className={item.href === `/${route}` ? "active" : ""} href={item.href} key={item.href}>
                {item.label}
              </a>
            ))}
          </nav>
        </header>

        <div className="public-legal-layout">
          <article className="public-legal-article">
            <header className="public-legal-article__header">
              <h1>{content.title}</h1>
              <p className="public-legal-meta">Last updated: {content.updatedAt}</p>
            </header>

            <div className="public-legal-article__body">
              {content.sections.map((section) => (
                <section className="public-legal-section" id={section.id} key={section.id}>
                  <h2>{section.title}</h2>
                  {section.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </section>
              ))}
            </div>
          </article>

          <aside className="public-legal-sidebar" aria-label="Articles in this section">
            <div className="public-legal-sidebar__card">
              <h2>Articles in this section</h2>
              <nav>
                {sectionLinks[route].map((item) => (
                  <a className={item.href === `/${route}` ? "active" : ""} href={item.href} key={item.href}>
                    {item.label}
                  </a>
                ))}
              </nav>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
