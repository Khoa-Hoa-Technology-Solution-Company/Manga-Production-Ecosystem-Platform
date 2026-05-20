export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-neutral-900 text-neutral-400 pt-16" id="footer">
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
        {/* Footer Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr] gap-8 lg:gap-12 pb-12 border-b border-neutral-800">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1 max-w-none lg:max-w-[280px]">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-white flex items-center justify-center text-neutral-900 text-xs">
                <i className="fa-solid fa-book-open" />
              </div>
              <span className="text-lg font-semibold text-white">MangaFlow</span>
            </div>
            <p className="text-sm leading-relaxed mb-6">
              The complete manga production ecosystem. Connecting creators,
              assistants, editors, and readers worldwide.
            </p>
            <div className="flex gap-3">
              {[
                { icon: 'fa-brands fa-x-twitter', label: 'Twitter' },
                { icon: 'fa-brands fa-discord', label: 'Discord' },
                { icon: 'fa-brands fa-github', label: 'GitHub' },
                { icon: 'fa-brands fa-youtube', label: 'YouTube' },
              ].map((social) => (
                <a
                  key={social.label}
                  href="#"
                  aria-label={social.label}
                  className="w-9 h-9 flex items-center justify-center border border-neutral-700 text-neutral-400 text-sm hover:border-white hover:text-white transition-colors"
                >
                  <i className={social.icon} />
                </a>
              ))}
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-white text-sm font-semibold uppercase tracking-wide mb-4">
              Product
            </h4>
            <nav className="flex flex-col gap-3">
              {['Features', 'Ecosystem', 'Pricing', 'Integrations', 'Changelog'].map((link) => (
                <a key={link} href="#" className="text-sm text-neutral-400 hover:text-white transition-colors">
                  {link}
                </a>
              ))}
            </nav>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-white text-sm font-semibold uppercase tracking-wide mb-4">
              Company
            </h4>
            <nav className="flex flex-col gap-3">
              {['About Us', 'Blog', 'Careers', 'Press Kit', 'Contact'].map((link) => (
                <a key={link} href="#" className="text-sm text-neutral-400 hover:text-white transition-colors">
                  {link}
                </a>
              ))}
            </nav>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-white text-sm font-semibold uppercase tracking-wide mb-4">
              Resources
            </h4>
            <nav className="flex flex-col gap-3">
              {['Documentation', 'API Reference', 'Community', 'Support', 'Status'].map((link) => (
                <a key={link} href="#" className="text-sm text-neutral-400 hover:text-white transition-colors">
                  {link}
                </a>
              ))}
            </nav>
          </div>
        </div>

        {/* Copyright */}
        <div className="py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[0.8125rem]">
          <span>© {year} MangaFlow. All rights reserved.</span>
          <div className="flex gap-6">
            <a href="#" className="text-neutral-500 hover:text-white transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="text-neutral-500 hover:text-white transition-colors">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
