import Link from "next/link";
import { Logo } from "@/components/logo";
import { Container } from "@/components/ui/container";
import { getSiteSettings } from "@/lib/cms/service";

const columns = [
  {
    title: "Company",
    links: [
      { href: "/about", label: "About Us" },
      { href: "/projects", label: "Projects" },
      { href: "/faq", label: "FAQ" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Rentals",
    links: [
      { href: "/screens", label: "LED Screens" },
      { href: "/solutions", label: "Solutions" },
      { href: "/packages", label: "Packages" },
      { href: "/configure", label: "Build Your Screen" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/login", label: "Login" },
      { href: "/register", label: "Register" },
      { href: "/portal", label: "Customer Portal" },
    ],
  },
];

export async function Footer() {
  const settings = await getSiteSettings();
  const socialLinks = [{ label: "IG", href: String(settings["social.instagram"] || "") }, { label: "IN", href: String(settings["social.linkedin"] || "") }].filter((item) => item.href);
  return (
    <footer className="border-t border-border bg-surface/40 pt-20 pb-10">
      <Container>
        <div className="grid grid-cols-2 gap-10 lg:grid-cols-6">
          <div className="col-span-2">
            <Logo />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-muted">
              {String(settings["footer.description"] || "Premium modular LED screens for conferences, exhibitions, celebrations and live events — delivered, installed and supported by our technical team.")}
            </p>
            <div className="mt-6 flex gap-3">
              {socialLinks.map(({ label, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-[10px] font-semibold text-muted hover:text-accent hover:border-accent/40 transition-colors"
                >
                  {label}
                </a>
              ))}
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold text-foreground">{col.title}</h4>
              <ul className="mt-4 space-y-3">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-muted hover:text-foreground transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h4 className="text-sm font-semibold text-foreground">Contact</h4>
            <ul className="mt-4 space-y-3 text-sm text-muted">
              <li>{String(settings["contact.address"] || "Doha, Qatar")}</li>
              <li>{String(settings["contact.phone"] || "+974 4000 1234")}</li>
              <li>{String(settings["contact.email"] || "hello@ledwave.events")}</li>
              <li>24/7 Event Support</li>
            </ul>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-4 border-t border-border pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-2">© {new Date().getFullYear()} LEDWAVE Event Technology. All rights reserved.</p>
          <div className="flex gap-6 text-xs text-muted-2">
            <a href="#" className="hover:text-muted">Terms & Conditions</a>
            <a href="#" className="hover:text-muted">Privacy Policy</a>
          </div>
        </div>
      </Container>
    </footer>
  );
}
