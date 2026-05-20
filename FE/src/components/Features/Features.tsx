const FEATURES = [
  {
    icon: 'fa-solid fa-pen-nib',
    title: 'Canvas Annotation',
    description:
      'Real-time collaborative drawing and annotation tools. Mark up panels, add notes, and provide feedback directly on the canvas with your team.',
    checks: [
      'Live cursor tracking',
      'Multi-layer annotations',
      'Version control system',
    ],
  },
  {
    icon: 'fa-solid fa-diagram-project',
    title: 'Automated Workflow',
    description:
      'Streamline your production pipeline with intelligent task automation, deadline tracking, and progress monitoring across all stages.',
    checks: [
      'Smart task assignment',
      'Deadline notifications',
      'Progress analytics',
    ],
  },
  {
    icon: 'fa-solid fa-users',
    title: 'Role-Based Ecosystem',
    description:
      'Customized interfaces and permissions for Mangaka, Assistants, Editors, and Readers. Everyone gets exactly what they need.',
    checks: [
      'Granular permissions',
      'Custom dashboards',
      'Team collaboration',
    ],
  },
];

export default function Features() {
  return (
    <section className="py-12 lg:py-20 border-b border-neutral-200" id="features">
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10 lg:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-neutral-100 border border-neutral-200 text-xs font-medium text-neutral-900 mb-4">
            <i className="fa-solid fa-star" />
            <span>Core Features</span>
          </div>
          <h2 className="text-3xl lg:text-4xl mb-4">
            Everything You Need for Manga Production
          </h2>
          <p className="text-lg text-neutral-600">
            Powerful tools designed for modern manga creators and their teams
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="border border-neutral-200 bg-white p-8 hover:border-neutral-900 hover:shadow-md transition-all duration-200"
            >
              <div className="w-12 h-12 bg-neutral-900 flex items-center justify-center mb-6 text-white text-xl">
                <i className={feature.icon} />
              </div>
              <h3 className="text-xl mb-3">{feature.title}</h3>
              <p className="text-neutral-600 mb-6 leading-relaxed">
                {feature.description}
              </p>
              <ul className="flex flex-col gap-3">
                {feature.checks.map((check) => (
                  <li
                    key={check}
                    className="flex items-start gap-2 text-sm text-neutral-600"
                  >
                    <i className="fa-solid fa-check text-neutral-900 mt-0.5 shrink-0" />
                    <span>{check}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
