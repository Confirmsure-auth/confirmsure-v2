// 9. Create app/page.js (Homepage)
import Link from 'next/link'
import { Shield, CheckCircle, Eye } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="h-8 w-8 text-confirmsure-blue" />
            <h1 className="text-2xl font-bold text-gray-900">ConfirmSure</h1>
          </div>
          <nav className="hidden md:flex space-x-6">
            <a href="#features" className="text-gray-600 hover:text-confirmsure-blue">Features</a>
            <a href="#demo" className="text-gray-600 hover:text-confirmsure-blue">Demo</a>
            <a href="#contact" className="text-gray-600 hover:text-confirmsure-blue">Contact</a>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-12">
        <div className="text-center max-w-4xl mx-auto">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Eliminating Counterfeiting
            <span className="text-confirmsure-blue"> Globally</span>
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            We protect brand reputation and consumer trust through cutting-edge authentication technology that makes fraud impossible.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/product/CS-DEMO-001" className="btn-primary">
              View Demo Product
            </Link>
            <button className="border-2 border-confirmsure-blue text-confirmsure-blue px-6 py-3 rounded-lg font-medium hover:bg-blue-50 transition-colors">
              Learn More
            </button>
          </div>
        </div>

        {/* Features */}
        <section id="features" className="mt-20">
          <h3 className="text-3xl font-bold text-center mb-12">How ConfirmSure Works</h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Eye className="h-8 w-8 text-confirmsure-blue" />
              </div>
              <h4 className="text-xl font-semibold mb-3">Visual Verification</h4>
              <p className="text-gray-600">Unique visual markers applied at factory create impossible-to-counterfeit authentication.</p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-confirmsure-green" />
              </div>
              <h4 className="text-xl font-semibold mb-3">Instant Verification</h4>
              <p className="text-gray-600">Customers scan QR code to instantly verify product authenticity with our secure system.</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-confirmsure-blue" />
              </div>
              <h4 className="text-xl font-semibold mb-3">Brand Protection</h4>
              <p className="text-gray-600">Protect your brand reputation and customer trust with unbreakable authentication.</p>
            </div>
          </div>
        </section>

        {/* Demo Section */}
        <section id="demo" className="mt-20 bg-white rounded-2xl p-8 shadow-lg">
          <div className="text-center">
            <h3 className="text-3xl font-bold mb-4">Try Our Demo</h3>
            <p className="text-gray-600 mb-6">See how customers verify product authenticity</p>
            <Link href="/product/CS-DEMO-001" className="btn-primary">
              View Demo Product Authentication
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-20">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Shield className="h-6 w-6" />
            <span className="text-xl font-bold">ConfirmSure</span>
          </div>
          <p className="text-gray-400">Making counterfeiting impossible, one product at a time.</p>
        </div>
      </footer>
    </div>
  )
}
