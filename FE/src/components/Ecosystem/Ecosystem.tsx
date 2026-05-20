interface RoleFeature {
  title: string;
  description: string;
}

interface Role {
  icon: string;
  title: string;
  subtitle: string;
  features: RoleFeature[];
}

const ROLES: Role[] = [
  {
    icon: 'fa-solid fa-paintbrush',
    title: 'For Mangaka',
    subtitle: 'Lead your creative vision with powerful project management tools',
    features: [
      { title: 'Project Dashboard', description: 'Manage multiple series and track overall progress' },
      { title: 'Team Management', description: 'Assign tasks and collaborate with assistants' },
      { title: 'Revenue Analytics', description: 'Track earnings and reader engagement metrics' },
    ],
  },
  {
    icon: 'fa-solid fa-hands-helping',
    title: 'For Assistants',
    subtitle: 'Streamline your workflow with clear task assignments',
    features: [
      { title: 'Task Queue', description: 'Prioritized list of backgrounds, inking, and tone work' },
      { title: 'Time Tracking', description: 'Log hours and manage multiple project assignments' },
      { title: 'Portfolio Building', description: 'Showcase your work and connect with creators' },
    ],
  },
  {
    icon: 'fa-solid fa-clipboard-check',
    title: 'For Editors',
    subtitle: 'Oversee quality and guide creative direction',
    features: [
      { title: 'Review Workflow', description: 'Approve drafts and provide structured feedback' },
      { title: 'Editorial Board', description: 'Collaborate with other editors on decisions' },
      { title: 'Publishing Pipeline', description: 'Schedule releases and manage serialization' },
    ],
  },
  {
    icon: 'fa-solid fa-book-reader',
    title: 'For Readers',
    subtitle: 'Discover, read, and support your favorite creators',
    features: [
      { title: 'Personalized Library', description: 'Follow series and get notified of new chapters' },
      { title: 'Early Access', description: 'Support creators with premium subscriptions' },
      { title: 'Community Features', description: 'Comment, rate, and engage with creators' },
    ],
  },
];

export default function Ecosystem() {
  return (
    <section className="py-12 lg:py-20 bg-neutral-50 border-b border-neutral-200" id="ecosystem">
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10 lg:mb-16">
          <h2 className="text-3xl lg:text-4xl mb-4">
            Built for Every Role in Manga Production
          </h2>
          <p className="text-lg text-neutral-600">
            Tailored experiences for creators, assistants, editors, and readers
          </p>
        </div>

        {/* Role Cards */}
        <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
          {ROLES.map((role) => (
            <div
              key={role.title}
              className="bg-white border border-neutral-200 p-8 hover:shadow-md hover:border-neutral-300 transition-all duration-200"
            >
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 bg-neutral-900 flex items-center justify-center shrink-0 text-white">
                  <i className={role.icon} />
                </div>
                <div>
                  <h3 className="text-2xl mb-2">{role.title}</h3>
                  <p className="text-neutral-600 text-[0.9375rem]">{role.subtitle}</p>
                </div>
              </div>
              <div className="flex flex-col gap-4">
                {role.features.map((feature) => (
                  <div key={feature.title} className="flex items-start gap-3">
                    <i className="fa-solid fa-circle-check text-neutral-900 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-neutral-900 font-medium mb-1">
                        {feature.title}
                      </div>
                      <div className="text-sm text-neutral-600">
                        {feature.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
