import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { 
  ArrowRight, BarChart3, MessageSquare, Zap, PlayCircle, ShieldCheck,
  TrendingUp, Bookmark, Bell, LayoutDashboard, Target
} from 'lucide-react';

function App() {
  const { scrollYProgress } = useScroll();
  const heroY = useTransform(scrollYProgress, [0, 1], [0, -150]);

  const fadeIn = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
  };

  const stagger = {
    animate: {
      transition: { staggerChildren: 0.1 }
    }
  };

  const features = [
    {
      id: 'dashboard',
      icon: LayoutDashboard,
      title: "Dashboard Integral",
      desc: "Ten una vista de pájaro del rendimiento de tu canal, suscriptores, vistas y analíticas clave en un solo lugar.",
      image: "file:///C:/Users/jhona/.gemini/antigravity-ide/brain/5bafc149-06ee-433c-ba0d-72d2d5196a43/dashboard_mockup_1790574578589.jpg"
    },
    {
      id: 'oportunidades',
      icon: Target,
      title: "Oportunidades de Contenido",
      desc: "Convierte sugerencias y fricciones de tu audiencia en tu próximo video viral. Deja de adivinar qué grabar.",
      image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80"
    },
    {
      id: 'competidores',
      icon: Zap,
      title: "Radar de Competidores",
      desc: "Monitorea a otros canales de tu nicho. Descubre qué les funciona, compara tu crecimiento y detecta huecos en el mercado.",
      image: "file:///C:/Users/jhona/.gemini/antigravity-ide/brain/5bafc149-06ee-433c-ba0d-72d2d5196a43/competitor_radar_mockup_1790574589652.jpg"
    },
    {
      id: 'tendencias',
      icon: TrendingUp,
      title: "Tendencias y Keywords",
      desc: "Anticípate a la curva. Descubre los temas que están ganando tracción en tu nicho antes de que exploten.",
      image: "file:///C:/Users/jhona/.gemini/antigravity-ide/brain/5bafc149-06ee-433c-ba0d-72d2d5196a43/trends_mockup_1790574600915.jpg"
    }
  ];

  const tools = [
    { icon: MessageSquare, name: "Análisis de Comentarios" },
    { icon: Bookmark, name: "Ideas Guardadas" },
    { icon: Bell, name: "Alertas Tempranas" },
    { icon: ShieldCheck, name: "Salud de Marca" }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-indigo-500/30 font-sans overflow-x-hidden">
      {/* Light Background gradients */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-200/50 blur-[120px]" />
        <div className="absolute top-[20%] right-[-10%] w-[40%] h-[60%] rounded-full bg-purple-200/50 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[20%] w-[60%] h-[50%] rounded-full bg-blue-200/50 blur-[120px]" />
      </div>

      {/* Navbar */}
      <nav className="fixed w-full z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
              <BarChart3 className="text-white" size={20} />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900">Content Radar</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <a href="#features" className="hover:text-indigo-600 transition-colors">Plataforma</a>
            <a href="#tools" className="hover:text-indigo-600 transition-colors">Herramientas</a>
            <a href="#pricing" className="hover:text-indigo-600 transition-colors">Precios</a>
          </div>
          <div className="flex items-center gap-4">
            <a href="http://localhost:5173" className="text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors hidden sm:block">
              Entrar
            </a>
            <a href="http://localhost:5173" className="px-5 py-2.5 rounded-full bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition-all shadow-md hover:shadow-xl">
              Prueba Gratis
            </a>
          </div>
        </div>
      </nav>

      <main className="relative z-10 pt-20">
        {/* Hero Section */}
        <section className="pt-20 pb-24 px-6 relative">
          <motion.div 
            className="max-w-5xl mx-auto text-center"
            style={{ y: heroY }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold mb-8 tracking-wide shadow-sm"
            >
              <Zap size={14} className="fill-indigo-500" />
              NUEVO: RADAR DE COMPETIDORES Y TENDENCIAS
            </motion.div>
            
            <motion.h1 
              className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-[1.15] text-slate-900"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              Domina tu nicho con <br className="hidden md:block" />
              datos, <span className="text-gradient">no con intuición</span>
            </motion.h1>
            
            <motion.p 
              className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-12 leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              La plataforma todo-en-uno para creadores. Analiza miles de comentarios con IA, descubre tendencias ocultas, y espía éticamente el crecimiento de tu competencia.
            </motion.p>
            
            <motion.div 
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <a href="http://localhost:5173" className="px-8 py-4 rounded-full bg-indigo-600 text-white font-bold text-base hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-500/25 hover:-translate-y-0.5 flex items-center gap-2 w-full sm:w-auto justify-center group">
                Comenzar gratis
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </a>
              <button className="px-8 py-4 rounded-full bg-white border border-slate-200 text-slate-700 font-bold text-base hover:bg-slate-50 transition-all flex items-center gap-2 w-full sm:w-auto justify-center shadow-sm">
                <PlayCircle size={18} />
                Ver video demo
              </button>
            </motion.div>
          </motion.div>
        </section>

        {/* Feature Showcase Showcase with Scrolling Images */}
        <section id="features" className="py-24 px-6">
          <div className="max-w-7xl mx-auto">
            {features.map((feature, index) => (
              <motion.div 
                key={feature.id}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.7, ease: "easeOut" }}
                className={`flex flex-col ${index % 2 === 1 ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-12 lg:gap-24 mb-32 last:mb-0`}
              >
                <div className="flex-1 space-y-6">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 mb-6 shadow-inner">
                    <feature.icon size={28} />
                  </div>
                  <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
                    {feature.title}
                  </h2>
                  <p className="text-lg text-slate-600 leading-relaxed">
                    {feature.desc}
                  </p>
                  <ul className="space-y-3 pt-4">
                    {[1, 2, 3].map((i) => (
                      <li key={i} className="flex items-center gap-3 text-slate-700 font-medium">
                        <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        </div>
                        Beneficio clave de esta función {i}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex-1 w-full relative group">
                  {/* Decorative blobs */}
                  <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-3xl blur-2xl opacity-10 group-hover:opacity-20 transition-opacity duration-500" />
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200/60 bg-white shadow-2xl p-2">
                    <img 
                      src={feature.image} 
                      alt={feature.title}
                      className="w-full h-auto rounded-xl object-cover hover:scale-[1.02] transition-transform duration-700"
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Mini Tools Grid */}
        <section id="tools" className="py-24 px-6 bg-slate-900 text-white rounded-[3rem] mx-4 sm:mx-8 mb-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
          <div className="max-w-7xl mx-auto relative z-10">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Todo el arsenal en tu bolsillo</h2>
              <p className="text-slate-400 max-w-2xl mx-auto text-lg">Más herramientas diseñadas específicamente para el creador de contenido moderno.</p>
            </div>
            
            <motion.div 
              className="grid grid-cols-2 md:grid-cols-4 gap-6"
              variants={stagger}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
            >
              {tools.map((tool, i) => (
                <motion.div 
                  key={i}
                  variants={fadeIn}
                  className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer group flex flex-col items-center text-center gap-4"
                >
                  <div className="w-12 h-12 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <tool.icon size={24} />
                  </div>
                  <h3 className="font-semibold text-slate-200">{tool.name}</h3>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-slate-200 text-center text-slate-500 font-medium relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="text-indigo-600" size={20} />
            <span className="font-bold text-lg tracking-tight text-slate-900">Content Radar</span>
          </div>
          <p>© {new Date().getFullYear()} Content Radar. Todos los derechos reservados.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-slate-800">Twitter</a>
            <a href="#" className="hover:text-slate-800">YouTube</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
