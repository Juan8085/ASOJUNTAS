import Link from "next/link";
import { Building2, ShieldCheck, Users, Landmark, ShoppingBag, ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-emerald-50/20 text-slate-800">
      {/* Top Header */}
      <header className="border-b bg-white/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold shadow-md shadow-emerald-500/20">
              CJ
            </div>
            <div>
              <span className="font-bold text-xl text-slate-900 tracking-tight">Conecta<span className="text-emerald-600">JAC</span></span>
              <span className="text-xs text-slate-400 block -mt-1 font-medium">Plataforma Comunal Multi-Tenant</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/auth/login"
              className="text-sm font-medium text-slate-600 hover:text-emerald-600 transition"
            >
              Iniciar Sesión
            </Link>
            <Link
              href="/auth/login"
              className="text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg shadow-sm transition inline-flex items-center gap-2"
            >
              Ingresar al Panel <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 pt-16 pb-24">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100/70 border border-emerald-200 text-emerald-800 text-xs font-semibold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Arquitectura SaaS Multi-Tenant para Asojuntas & JAC
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Gestión comunal digital, transparente y conectada con la vereda
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed">
            Plataforma integral para Juntas de Acción Comunal. Libro digital de afiliados conforme a la Ley 2166, certificados con código QR verificable, tesorería con recaudo electrónico y mercado campesino veredal.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-3 gap-6 mt-16">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <Building2 className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">Asojuntas (Super Admin)</h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              Consolidación municipal, onboarding de nuevas JACs, censo comunal municipal, auditoría global y circulares normativas directas.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
              <Users className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">Directivos de JAC</h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              Libro digital de afiliados foliado, emisión de certificados de residencia con QR, gestión de mingas comunitarias y buzón PQRSD.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
              <Landmark className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">Tesorería & Pasarelas</h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              Recaudo de cuotas ordinarias y extraordinarias vía PSE, Nequi y Daviplata. Libro contable transparente de ingresos y egresos comunales.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
