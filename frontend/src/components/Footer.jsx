const footerStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Public+Sans:wght@300;400;500;600;700&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

  .db-footer {
    background: #fff;
    border-top: 1px solid #e2e8f0;
    margin-top: 3rem;
    padding: 3rem 0 0;
    font-family: 'Public Sans', sans-serif;
  }
  .db-footer-inner {
    max-width: 1280px; margin: 0 auto; padding: 0 1rem;
    display: grid; grid-template-columns: 1fr; gap: 2rem;
  }
  @media (min-width: 768px) {
    .db-footer-inner { grid-template-columns: repeat(4, 1fr); }
  }
  .db-footer-brand {
    display: flex; align-items: center; gap: 0.5rem;
    color: #00007a; margin-bottom: 1rem; opacity: 0.8;
  }
  .db-footer-brand svg { width: 1.5rem; height: 1.5rem; flex-shrink: 0; }
  .db-footer-brand h2 {
    font-size: 0.75rem; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.1em;
  }
  .db-footer-desc { font-size: 0.75rem; color: #64748b; line-height: 1.6; }
  .db-footer-col h4 {
    font-size: 0.75rem; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.1em;
    color: #0f172a; margin-bottom: 1rem;
  }
  .db-footer-col ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.5rem; }
  .db-footer-col ul li { display: flex; align-items: center; gap: 0.5rem; font-size: 0.75rem; color: #64748b; }
  .db-footer-col ul li a { font-size: 0.75rem; color: #64748b; text-decoration: none; transition: color 0.2s; }
  .db-footer-col ul li a:hover { color: #00007a; }
  .db-footer-col ul li .material-symbols-outlined { font-size: 0.75rem; flex-shrink: 0; }
  .db-footer-bottom {
    max-width: 1280px; margin: 3rem auto 0; padding: 2rem 1rem;
    border-top: 1px solid #f1f5f9;
    display: flex; flex-direction: column; align-items: center; gap: 1rem; justify-content: space-between;
  }
  @media (min-width: 768px) { .db-footer-bottom { flex-direction: row; } }
  .db-footer-bottom p { font-size: 0.625rem; color: #94a3b8; }
  .db-footer-icons { display: flex; gap: 1rem; }
  .db-footer-icons a { color: #94a3b8; text-decoration: none; transition: color 0.2s; }
  .db-footer-icons a:hover { color: #00007a; }
  .db-footer-icons .material-symbols-outlined { font-size: 1.125rem; display: block; }
`;

const Footer = () => {
  return (
    <>
      <style>{footerStyles}</style>
      <footer className="db-footer">
        <div className="db-footer-inner">

          {/* Brand */}
          <div>
            <div className="db-footer-brand">
              <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path clipRule="evenodd"
                  d="M24 0.757355L47.2426 24L24 47.2426L0.757355 24L24 0.757355ZM21 35.7574V12.2426L9.24264 24L21 35.7574Z"
                  fill="currentColor" fillRule="evenodd" />
              </svg>
              <h2>Banque Centrale</h2>
            </div>
            <p className="db-footer-desc">
              Plateforme de recrutement automatisée. L'excellence au service de la stabilité monétaire et de l'innovation financière.
            </p>
          </div>

          {/* Candidats */}
          <div className="db-footer-col">
            <h4>Candidats</h4>
            <ul>
              <li><a href="#">Toutes les offres</a></li>
              <li><a href="#">Processus de recrutement</a></li>
              <li><a href="#">FAQ Candidat</a></li>
              <li><a href="#">Conseils CV &amp; Entretien</a></li>
            </ul>
          </div>

          {/* Légal */}
          <div className="db-footer-col">
            <h4>Légal</h4>
            <ul>
              <li><a href="#">Mentions Légales</a></li>
              <li><a href="#">Protection des Données (RGPD)</a></li>
              <li><a href="#">Accessibilité</a></li>
              <li><a href="#">Conditions Générales</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div className="db-footer-col">
            <h4>Contact</h4>
            <ul>
              <li>
                <span className="material-symbols-outlined">location_on</span>
                Paris, France
              </li>
              <li>
                <span className="material-symbols-outlined">mail</span>
                recrutement@banquecentrale.fr
              </li>
              <li>
                <span className="material-symbols-outlined">phone</span>
                +33 (0)1 00 00 00 00
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="db-footer-bottom">
          <p>© 2024 Banque Centrale de l'Union. Tous droits réservés.</p>
          <div className="db-footer-icons">
            <a href="#" aria-label="Site web">
              <span className="material-symbols-outlined">public</span>
            </a>
            <a href="#" aria-label="Partager">
              <span className="material-symbols-outlined">share</span>
            </a>
          </div>
        </div>

      </footer>
    </>
  );
};

export default Footer;