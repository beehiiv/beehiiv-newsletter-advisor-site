import { Link } from 'react-router-dom'
import { ArrowRight, Sparkles, Target, Eye, Zap } from 'lucide-react'

export default function About() {
  return (
    <div className="min-h-screen">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-8 py-20">
        {/* Hero */}
        <div className="max-w-3xl mb-20">
          <h1 className="font-clash text-4xl lg:text-6xl font-bold leading-tight">
            About{' '}
            <span className="gradient-text">Digital Products</span>
          </h1>
          <p className="text-xl text-brand-grey mt-6">
            A curated collection of the best digital product examples from around the web.
            Built for designers, developers, and product makers seeking inspiration.
          </p>
        </div>

        {/* Values */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          {[
            {
              icon: Eye,
              title: 'Curated Quality',
              description: 'Every product is hand-picked for excellence in design, functionality, and user experience.',
            },
            {
              icon: Target,
              title: 'Organized',
              description: 'Browse by category, filter by features, and find exactly what you need for inspiration.',
            },
            {
              icon: Zap,
              title: 'Always Fresh',
              description: 'Regularly updated with the latest and greatest digital products from across the industry.',
            },
          ].map((value) => (
            <div
              key={value.title}
              className="p-6 bg-brand-dark border border-white/10 rounded-lg"
            >
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-brand-purple/20 to-brand-accent/20 flex items-center justify-center mb-4">
                <value.icon className="w-6 h-6 text-brand-accent" />
              </div>
              <h3 className="font-clash text-xl font-bold mb-2">{value.title}</h3>
              <p className="text-brand-grey">{value.description}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center py-20 border-y border-white/10">
          <Sparkles className="w-8 h-8 text-brand-accent mx-auto mb-4" />
          <h2 className="font-clash text-3xl font-bold mb-4">Ready to Explore?</h2>
          <p className="text-brand-grey max-w-md mx-auto mb-8">
            Dive into our collection and discover your next source of inspiration.
          </p>
          <Link
            to="/browse"
            className="btn-stack inline-flex items-center gap-2 px-8 py-4 bg-white text-black font-medium rounded-md hover:bg-brand-accent transition-colors"
          >
            Browse Products
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Contact */}
        <div className="mt-20 text-center">
          <h2 className="font-clash text-2xl font-bold mb-4">Have a Product to Suggest?</h2>
          <p className="text-brand-grey max-w-md mx-auto">
            Know of an amazing digital product that should be featured? We'd love to hear about it.
          </p>
          <a
            href="mailto:hello@example.com"
            className="inline-flex items-center gap-2 mt-6 text-brand-accent hover:text-brand-flamingo transition-colors"
          >
            Get in Touch
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  )
}
