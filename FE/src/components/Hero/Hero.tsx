import dashboardPreview from '../../assets/dashboard-preview.png';

export default function Hero() {
  return (
    <section className="border-b border-neutral-200" id="hero">
      <div className="max-w-7xl mx-auto px-5 lg:px-8 grid lg:grid-cols-2 gap-12 items-center py-16 lg:py-20 min-h-[560px]">
        {/* Left — Copy */}
        <div className="animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-neutral-100 border border-neutral-200 text-xs font-medium text-neutral-900 mb-4">
            <i className="fa-solid fa-bolt" />
            <span>Real-Time Collaboration Platform</span>
          </div>

          <h1 className="text-4xl lg:text-5xl xl:text-[3.25rem] leading-[1.1] tracking-tight mb-6">
            The Complete Manga Production Ecosystem
          </h1>

          <p className="text-lg leading-relaxed text-neutral-600 mb-8">
            Connect Mangaka, Assistants, Editors, and Readers in one unified
            platform. Streamline your workflow with real-time canvas annotation,
            automated task management, and role-based collaboration tools.
          </p>

          <div className="flex flex-col sm:flex-row flex-wrap gap-4 mb-6">
            <button className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium bg-neutral-900 text-white hover:bg-neutral-800 transition-colors">
              Start Creating Free
              <i className="fa-solid fa-arrow-right" />
            </button>
            <button className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium border border-neutral-300 text-neutral-900 hover:bg-neutral-50 transition-colors">
              Watch Demo
              <i className="fa-solid fa-play" />
            </button>
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3 sm:gap-8">
            <div className="flex items-center gap-2 text-sm text-neutral-600">
              <i className="fa-solid fa-circle-check text-neutral-900" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-neutral-600">
              <i className="fa-solid fa-circle-check text-neutral-900" />
              <span>14-day free trial</span>
            </div>
          </div>
        </div>

        {/* Right — Dashboard Preview */}
        <div className="hidden lg:block relative h-[460px] bg-neutral-100 border border-neutral-200 overflow-hidden animate-fade-in-delayed">
          <div className="absolute top-3 left-3 flex gap-1.5 z-10">
            <div className="w-2.5 h-2.5 rounded-full bg-neutral-300" />
            <div className="w-2.5 h-2.5 rounded-full bg-neutral-300" />
            <div className="w-2.5 h-2.5 rounded-full bg-neutral-300" />
          </div>
          <img
            src={dashboardPreview}
            alt="MangaFlow platform dashboard showing manga production workflow"
            className="w-full h-full object-cover object-top-left"
            loading="eager"
          />
        </div>
      </div>
    </section>
  );
}
