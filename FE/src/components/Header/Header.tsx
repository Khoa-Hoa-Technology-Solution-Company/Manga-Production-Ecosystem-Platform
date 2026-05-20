import { useState, useCallback } from 'react';

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Ecosystem', href: '#ecosystem' },
  { label: 'Pricing', href: '#cta-blocks' },
  { label: 'Testimonials', href: '#social-proof' },
];

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const openMenu = useCallback(() => setMobileOpen(true), []);
  const closeMenu = useCallback(() => setMobileOpen(false), []);

  const handleNavClick = useCallback(() => {
    setMobileOpen(false);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-neutral-200" id="header">
      <div className="max-w-7xl mx-auto px-5 lg:px-8 flex items-center justify-between h-16">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2 shrink-0" aria-label="MangaFlow home">
          <div className="w-8 h-8 bg-neutral-900 flex items-center justify-center text-white text-sm">
            <i className="fa-solid fa-book-open" />
          </div>
          <span className="text-xl font-semibold text-neutral-900">MangaFlow</span>
        </a>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8" aria-label="Main navigation">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors relative after:absolute after:bottom-[-2px] after:left-0 after:w-0 after:h-[1.5px] after:bg-neutral-900 after:transition-all hover:after:w-full"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Desktop Auth + Mobile Toggle */}
        <div className="flex items-center gap-3">
          <button className="hidden md:block px-4 py-2 text-sm font-medium text-neutral-900 hover:text-neutral-600 transition-colors">
            Sign In
          </button>
          <button className="px-4 py-2 text-sm font-medium bg-neutral-900 text-white hover:bg-neutral-800 transition-colors">
            Get Started
          </button>
          <button
            className="md:hidden flex items-center justify-center w-10 h-10 text-neutral-900 text-xl"
            onClick={openMenu}
            aria-label="Open menu"
          >
            <i className="fa-solid fa-bars" />
          </button>
        </div>
      </div>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-[200] md:hidden animate-fade-in"
          onClick={closeMenu}
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer */}
      <nav
        className={`fixed top-0 right-0 w-70 h-full bg-white z-[300] flex flex-col p-6 transition-transform duration-300 md:hidden ${
          mobileOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-label="Mobile navigation"
      >
        <button
          className="self-end w-10 h-10 flex items-center justify-center text-xl text-neutral-600 mb-6"
          onClick={closeMenu}
          aria-label="Close menu"
        >
          <i className="fa-solid fa-xmark" />
        </button>

        <div className="flex flex-col gap-1">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={handleNavClick}
              className="block px-4 py-3 text-base text-neutral-700 rounded-md hover:bg-neutral-100 transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="mt-auto flex flex-col gap-3 pt-6 border-t border-neutral-200">
          <button className="w-full px-6 py-3 text-sm font-medium border border-neutral-300 text-neutral-900 hover:bg-neutral-50 transition-colors">
            Sign In
          </button>
          <button className="w-full px-6 py-3 text-sm font-medium bg-neutral-900 text-white hover:bg-neutral-800 transition-colors">
            Get Started
          </button>
        </div>
      </nav>
    </header>
  );
}
