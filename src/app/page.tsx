"use client";

import { useEffect, useRef, useState } from "react";

type WebsiteEvent = {
  date: string;
  title: string;
  description: string;
  image: string;
  alt: string;
  cta?: {
    text: string;
    href: string;
  };
};

type CarouselHandlers = {
  track: HTMLElement;
  prev: HTMLButtonElement;
  next: HTMLButtonElement;
  update: () => void;
  onPrev: () => void;
  onNext: () => void;
  onScroll: () => void;
  onResize: () => void;
};

const DEFAULT_CTA = { text: "Réserver", href: "#contact" };
const STORAGE_KEY = "emmotors-events";

const DEFAULT_EVENTS = [
  {
    date: "Mars 2026",
    title: "Track Day Strasbourg",
    description: "Journée circuit pour découvrir la conduite sportive en toute sécurité.",
    image:
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1200&auto=format&fit=crop",
    alt: "Voiture sur circuit",
    cta: { text: "Réserver", href: "#contact" },
  },
  {
    date: "Avril 2026",
    title: "Visite d’usine",
    description: "Immersion dans les métiers de l’auto et rencontre de professionnels.",
    image:
      "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?q=80&w=1200&auto=format&fit=crop",
    alt: "Atelier automobile",
    cta: { text: "Réserver", href: "#contact" },
  },
  {
    date: "Mai 2026",
    title: "Cars & Coffee",
    description: "Rassemblement convivial et shooting photo avec les passionnés.",
    image:
      "https://images.unsplash.com/photo-1502877338535-766e1452684a?q=80&w=1200&auto=format&fit=crop",
    alt: "Rassemblement voitures",
    cta: { text: "Réserver", href: "#contact" },
  },
  {
    date: "Juin 2026",
    title: "Conférence Innovation",
    description: "Mobilité durable, nouvelles techs et invités du secteur.",
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200&auto=format&fit=crop",
    alt: "Conférence innovation auto",
    cta: { text: "Réserver", href: "#contact" },
  },
  {
    date: "Septembre 2026",
    title: "Rallye Étudiant",
    description: "Roadtrip et cohésion pour lancer l’année en beauté.",
    image:
      "https://images.unsplash.com/photo-1502872364588-894d6f2a7b87?q=80&w=1200&auto=format&fit=crop",
    alt: "Roadtrip étudiant",
    cta: { text: "Réserver", href: "#contact" },
  },
  {
    date: "Octobre 2026",
    title: "Salon Auto",
    description: "Visite collective et networking avec les marques partenaires.",
    image:
      "https://images.unsplash.com/photo-1493238792000-8113da705763?q=80&w=1200&auto=format&fit=crop",
    alt: "Salon automobile",
    cta: { text: "Réserver", href: "#contact" },
  },
] satisfies WebsiteEvent[];

const parseEvents = (value: string | null) => {
  if (!value) return null;
  try {
    const data = JSON.parse(value) as unknown;
    return Array.isArray(data) ? (data as WebsiteEvent[]) : null;
  } catch {
    return null;
  }
};

export default function Home() {
  const [events, setEvents] = useState<WebsiteEvent[]>(DEFAULT_EVENTS);
  const revealObserverRef = useRef<IntersectionObserver | null>(null);
  const setupRevealRef = useRef<(root?: ParentNode) => void>(() => {});
  const carouselHandlersRef = useRef<CarouselHandlers | null>(null);

  useEffect(() => {
    const cached = parseEvents(localStorage.getItem(STORAGE_KEY));
    if (cached && cached.length) {
      setEvents(cached);
    }

    let hasRendered = false;
    if (cached && cached.length) {
      hasRendered = true;
    }

    fetch("/events.json", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("events.json introuvable");
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setEvents(data as WebsiteEvent[]);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
          hasRendered = true;
        } else if (!hasRendered) {
          setEvents([]);
        }
      })
      .catch(() => {
        if (!hasRendered) setEvents(DEFAULT_EVENTS);
      });

    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      const updated = parseEvents(event.newValue);
      if (updated) setEvents(updated);
    };

    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("reveal-in");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 }
    );

    revealObserverRef.current = observer;

    const setupReveal = (root: ParentNode = document) => {
      const items = root.querySelectorAll(".reveal");
      items.forEach((item) => {
        const element = item as HTMLElement;
        if (element.dataset.revealObserved === "true") return;
        element.dataset.revealObserved = "true";
        observer.observe(element);
      });
    };

    setupRevealRef.current = setupReveal;

    const track = document.querySelector(".events-carousel") as HTMLElement | null;
    const prev = document.querySelector(".carousel-btn.prev") as HTMLButtonElement | null;
    const next = document.querySelector(".carousel-btn.next") as HTMLButtonElement | null;

    if (track && prev && next) {
      const step = () => {
        const card = track.querySelector(".event-card") as HTMLElement | null;
        if (!card) return 0;
        const gapValue = getComputedStyle(track).gap || "0";
        const gap = Number.parseInt(gapValue, 10) || 0;
        return card.offsetWidth + gap;
      };

      const update = () => {
        const max = track.scrollWidth - track.clientWidth - 2;
        prev.disabled = track.scrollLeft <= 0;
        next.disabled = track.scrollLeft >= max;
      };

      const onPrev = () => track.scrollBy({ left: -step(), behavior: "smooth" });
      const onNext = () => track.scrollBy({ left: step(), behavior: "smooth" });
      const onScroll = () => requestAnimationFrame(update);
      const onResize = () => update();

      prev.addEventListener("click", onPrev);
      next.addEventListener("click", onNext);
      track.addEventListener("scroll", onScroll);
      window.addEventListener("resize", onResize);

      carouselHandlersRef.current = {
        track,
        prev,
        next,
        update,
        onPrev,
        onNext,
        onScroll,
        onResize,
      };

      update();
    }

    return () => {
      observer.disconnect();
      const handlers = carouselHandlersRef.current;
      if (handlers) {
        handlers.prev.removeEventListener("click", handlers.onPrev);
        handlers.next.removeEventListener("click", handlers.onNext);
        handlers.track.removeEventListener("scroll", handlers.onScroll);
        window.removeEventListener("resize", handlers.onResize);
        carouselHandlersRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    setupRevealRef.current();
    const handlers = carouselHandlersRef.current;
    if (handlers) requestAnimationFrame(handlers.update);
  }, [events]);

  useEffect(() => {
    document.body.classList.add("is-loading");
    const loader = document.getElementById("page-loader");
    const heroVideo = document.querySelector(".hero-video") as HTMLVideoElement | null;
    let pageReady = false;
    let videoReady = !heroVideo || heroVideo.tagName.toLowerCase() !== "video";
    const loaderStart = performance.now();
    const minDuration = 2000;

    const hideLoader = () => {
      if (!loader) return;
      const elapsed = performance.now() - loaderStart;
      const delay = Math.max(0, minDuration - elapsed);
      window.setTimeout(() => {
        loader.classList.add("hidden");
        document.body.classList.remove("is-loading");
      }, delay);
    };

    const tryHide = () => {
      if (pageReady && videoReady) hideLoader();
    };

    const onLoad = () => {
      pageReady = true;
      tryHide();
    };

    window.addEventListener("load", onLoad);

    const onVideoReady = () => {
      videoReady = true;
      tryHide();
    };

    if (heroVideo && !videoReady) {
      heroVideo.addEventListener("loadeddata", onVideoReady, { once: true });
      heroVideo.addEventListener("canplaythrough", onVideoReady, { once: true });
      heroVideo.addEventListener("error", onVideoReady, { once: true });
    }

    const fallbackTimer = window.setTimeout(() => {
      videoReady = true;
      pageReady = true;
      hideLoader();
    }, 4000);

    return () => {
      document.body.classList.remove("is-loading");
      window.removeEventListener("load", onLoad);
      window.clearTimeout(fallbackTimer);
      if (heroVideo) {
        heroVideo.removeEventListener("loadeddata", onVideoReady);
        heroVideo.removeEventListener("canplaythrough", onVideoReady);
        heroVideo.removeEventListener("error", onVideoReady);
      }
    };
  }, []);

  const hasEvents = events.length > 0;

  return (
    <>
      <div className="page-loader" id="page-loader" aria-live="polite">
        <div className="loader-inner">
          <img className="loader-logo" src="/assets/logo.png" alt="EM’Motors" />
        </div>
      </div>
      <main className="page">
        <section className="hero">
          <video className="hero-video" autoPlay muted loop playsInline>
            <source src="/assets/video-bg.mp4" type="video/mp4" />
          </video>
          <header className="nav">
            <a className="nav-link" href="#evenements">
              ÉVÉNEMENTS
            </a>
            <a className="nav-link" href="#team">
              ÉQUIPE
            </a>
            <div className="logo" aria-hidden="true">
              <img src="/assets/logo.png" alt="" />
            </div>
            <a className="nav-link" href="#adhesion">
              ADHÉSION
            </a>
            <a
              className="btn btn-ghost nav-cta"
              href="/dashboard/login"
              target="_blank"
              rel="noreferrer"
              aria-label="Connexion réservée à l'équipe"
            >
              Connexion
            </a>
          </header>

          <div className="hero-content">
            <div className="partner-badge" aria-label="Plus de 30 membres">
              <div className="avatar-stack" aria-hidden="true">
                <img
                  src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80"
                  className="avatar a1"
                  alt=""
                />
                <img
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80"
                  className="avatar a2"
                  alt=""
                />
                <img
                  src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80"
                  className="avatar a3"
                  alt=""
                />
              </div>
              <span className="partner-text">+30 membres</span>
            </div>
            <h1>
              EM Motors<br />automobile club
            </h1>
            <p>
              L'association automobile de l'EM Strasbourg Business School. Événements,
              projets et innovation pour faire vibrer la passion auto sur le campus.
            </p>
            <div className="cta">
              <a className="btn btn-primary" href="#events">
                <i className="fa-solid fa-calendar-days" aria-hidden="true"></i>
                Voir les événements
              </a>
              <a className="btn btn-ghost" href="https://www.instagram.com/em_motors2025/">
                <i className="fa-solid fa-envelope" aria-hidden="true"></i>
                Nous contacter
              </a>
            </div>
          </div>
        </section>

        <section className="about" id="association">
          <div className="about-inner">
            <span className="about-pill reveal">Nos valeurs</span>
            <br />
            <br />
            <div className="about-content">
              <div className="about-text">
                <h2 className="reveal">EM Motors, votre passion notre moteur</h2>
                <p className="reveal">
                  L’EM Motors est un association défendant la passion automobile à travers
                  des actions évènementielles et professionnelles. Elle a pour mission
                  d’être une passerelle dans la recherche de stage ou d’alternance dans le
                  monde de l’automobile.
                </p>
                <div className="about-points">
                  <div className="about-point reveal">
                    <span className="bar"></span>
                    <div>
                      <h3>Notre slogan</h3>
                      <p>EM Motors, votre passion notre moteur</p>
                    </div>
                  </div>
                  <div className="about-point reveal">
                    <span className="bar"></span>
                    <div>
                      <h3>Notre mission</h3>
                      <p>Être une passerelle vers des stages et alternances dans l’automobile.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="about-image reveal">
                <img
                  src="https://www.em-strasbourg.com/sites/default/files/styles/hero_large/public/2021-01/Nos_Reseaux.jpg?itok=5nbkWRd9"
                  alt="Voiture sportive"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="events" id="evenements">
          <div className="events-inner">
            <span className="about-pill reveal">Événements</span>
            <br />
            <div className="events-header">
              <h2 className="reveal">Nos événements à venir</h2>
              <p className="reveal">
                Rencontres, visites, conférences et sorties auto tout au long de l’année.
              </p>
            </div>
            <div className={`events-carousel-wrap${hasEvents ? "" : " is-empty"}`}>
              {hasEvents ? (
                <>
                  <div className="events-carousel" aria-label="Carrousel des événements">
                    {events.map((event) => {
                      const cta = event.cta ?? DEFAULT_CTA;
                      return (
                        <article
                          className="event-card reveal"
                          key={`${event.title}-${event.date}`}
                        >
                          <div className="event-media">
                            {event.image ? (
                              <img
                                src={event.image}
                                alt={event.alt || event.title || "Événement EM’Motors"}
                              />
                            ) : null}
                          </div>
                          <div className="event-date">{event.date || ""}</div>
                          <h3>{event.title || ""}</h3>
                          <p>{event.description || ""}</p>
                          <br />
                          <a className="btn btn-ghost" href={cta.href || DEFAULT_CTA.href}>
                            {cta.text || DEFAULT_CTA.text}
                          </a>
                        </article>
                      );
                    })}
                  </div>
                  <div className="carousel-controls">
                    <button
                      className="carousel-btn prev"
                      type="button"
                      aria-label="Événement précédent"
                    >
                      <span aria-hidden="true">‹</span>
                    </button>
                    <button
                      className="carousel-btn next"
                      type="button"
                      aria-label="Événement suivant"
                    >
                      <span aria-hidden="true">›</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="events-empty reveal" role="status" aria-live="polite">
                  <p>Rien de disponible pour le moment.</p>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="team" id="team">
          <div className="events-inner">
            <span className="about-pill reveal">Équipe</span>
            <br />
            <div className="events-header">
              <h2 className="reveal">Le bureau EM’Motors</h2>
              <p className="reveal">
                Une équipe engagée pour faire vivre la passion auto sur le campus.
              </p>
            </div>
            <div className="team-grid">
              <article className="team-card reveal">
                <div className="team-photo t5"></div>
                <div className="team-name">Maxime Félix</div>
                <div className="team-role">Président</div>
              </article>
              <article className="team-card reveal">
                <div className="team-photo t1"></div>
                <div className="team-name">LEVY-BRZEZINSKI Leo</div>
                <div className="team-role">Vice président</div>
              </article>
              <article className="team-card reveal">
                <div className="team-photo t2"></div>
                <div className="team-name">METZGER Louis</div>
                <div className="team-role">Trésorier</div>
              </article>
              <article className="team-card reveal">
                <div className="team-photo t3"></div>
                <div className="team-name">SAINTY Amandine</div>
                <div className="team-role">Responsable Communication</div>
              </article>
              <article className="team-card reveal">
                <div className="team-photo t4"></div>
                <div className="team-name">BRAIG Florent</div>
                <div className="team-role">Responsable événementiel</div>
              </article>
            </div>
          </div>
        </section>

        {/*
        <section className="partners" id="partenaires">
          <div className="events-inner">
            <span className="about-pill reveal">Partenaires</span>
            <br />
            <div className="events-header partners-header">
              <h2 className="reveal">Ils roulent avec nous</h2>
              <p className="reveal">
                Des marques et entreprises qui soutiennent EM’Motors et nos projets étudiants.
              </p>
            </div>
            <div className="partners-grid">
              <div className="partner-card reveal">
                <img src="https://cdn.simpleicons.org/bugatti" alt="Bugatti" />
              </div>
              <div className="partner-card reveal">
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/9/9e/Mercedes-Benz_Logo_2010.svg"
                  alt="Mercedes-Benz"
                />
              </div>
              <div className="partner-card reveal">
                <img src="https://cdn.simpleicons.org/peugeot" alt="Peugeot" />
              </div>
              <div className="partner-card reveal">
                <img
                  src="https://logos-marques.com/wp-content/uploads/2021/03/Michelin-Logo.png"
                  alt="Michelin"
                />
              </div>
              <div className="partner-card reveal">
                <img
                  src="https://upload.wikimedia.org/wikipedia/fr/archive/f/f7/20210529181738%21Logo_TotalEnergies.svg"
                  alt="TotalEnergies"
                />
              </div>
              <div className="partner-card reveal">
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/f/f7/Logo_EMS.png"
                  alt="EM Strasbourg"
                />
              </div>
            </div>
            <div className="partners-cta reveal">
              <a className="btn btn-red" href="#contact">
                Devenir partenaire
              </a>
            </div>
          </div>
        </section>
        */}

        <section className="membership" id="adhesion">
          <div className="events-inner">
            <span className="about-pill reveal">Adhésion</span>
            <br />
            <div className="events-header membership-header">
              <h2 className="reveal">Rejoins l’équipe EM’Motors</h2>
              <p className="reveal">
                Accès aux événements privés, rencontres pros, sorties auto et projets concrets.
              </p>
            </div>
            <div className="membership-grid">
              <div className="membership-card gains reveal">
                <h3>Ce que tu gagnes</h3>
                <ul>
                  <li>Priorité sur les événements et visites</li>
                  <li>Réseau alumni et partenaires</li>
                  <li>Accès aux projets & ateliers</li>
                  <li>Tarifs réduits sur nos expériences</li>
                </ul>
              </div>
              <div className="membership-card highlight reveal">
                <h3>Pack Étudiant</h3>
                <p className="price">20€ / an</p>
                <p className="muted">Pour tous les étudiants EM Strasbourg.</p>
                <a className="btn btn-ghost" href="#contact">
                  S’inscrire
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="faq" id="faq">
          <div className="events-inner">
            <span className="about-pill reveal">FAQ</span>
            <br />
            <div className="events-header faq-header">
              <h2 className="reveal">Questions fréquentes</h2>
              <p className="reveal">Tout ce qu’il faut savoir avant de nous rejoindre.</p>
            </div>
            <div className="faq-list">
              <details className="faq-item reveal">
                <summary>Faut-il avoir une voiture pour adhérer ?</summary>
                <p>Non, la passion suffit. On accueille tous les profils.</p>
              </details>
              <details className="faq-item reveal">
                <summary>À quelle fréquence avez-vous des événements ?</summary>
                <p>En moyenne 1 à 2 événements par mois selon la période.</p>
              </details>
              <details className="faq-item reveal">
                <summary>Comment devenir partenaire ?</summary>
                <p>Écris-nous via la section contact, on te répond rapidement.</p>
              </details>
              <details className="faq-item reveal">
                <summary>Puis-je aider sur un projet sans être au bureau ?</summary>
                <p>Oui, on propose des missions ponctuelles pour les membres motivés.</p>
              </details>
            </div>
          </div>
        </section>

        <section className="contact-section" id="contact">
          <div className="contact-inner">
            <span className="about-pill reveal">Contact</span>
            <br />
            <br />
            <div className="events-header">
              <h2 className="reveal">Nous contacter</h2>
              <p className="reveal">
                Une question, un partenariat ou une idée d’événement ? Écris‑nous.
              </p>
            </div>
            <form className="contact-form reveal" action="https://formspree.io/f/" method="POST">
              <div className="contact-grid">
                <label>
                  Nom
                  <input type="text" name="name" placeholder="Votre nom" required />
                </label>
                <label>
                  Email
                  <input type="email" name="email" placeholder="votre@email.com" required />
                </label>
              </div>
              <label>
                Objet
                <input type="text" name="subject" placeholder="Partenariat, événement..." />
              </label>
              <label>
                Message
                <textarea
                  name="message"
                  rows={5}
                  placeholder="Votre message"
                  required
                ></textarea>
              </label>
              <button className="contact-submit" type="submit">
                Envoyer
              </button>
            </form>
          </div>
        </section>

        <footer className="footer">
          <div className="footer-inner">
            <div className="footer-brand reveal">
              <img src="/assets/logo.png" alt="EM Motors" />
            </div>
            <div className="footer-social reveal">
              <a href="https://www.instagram.com/em_motors2025/" aria-label="Instagram">
                <i className="fa-brands fa-instagram"></i>
              </a>
              <a href="#" aria-label="TikTok">
                <i className="fa-brands fa-tiktok"></i>
              </a>
              <a href="#" aria-label="LinkedIn">
                <i className="fa-brands fa-linkedin-in"></i>
              </a>
            </div>
            <div className="footer-copy reveal">
              © 2026 EM’Motors — EM Strasbourg Business School · Site web créé par{" "}
              <a
                href="https://msd-media.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-credit"
              >
                MSD Media
              </a>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}
