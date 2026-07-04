import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  CreditCard,
  Facebook,
  Instagram,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Package,
  MapPin,
  Phone,
  Plus,
  Search,
  ShoppingCart,
  Sparkles,
  Truck,
  Trash2,
  Upload,
  User,
  X
} from 'lucide-react';
import { api, uploadProductImage } from './api.js';
import { useAuth } from './state/AuthContext.jsx';
import { useCart } from './state/CartContext.jsx';

const defaultCategories = ['Sound Systems', 'LED Walls', 'Lights', 'Microphones', 'Projectors', 'Speakers'];
const statuses = ['Pending', 'Approved', 'Rejected', 'Paid', 'Completed', 'Cancelled'];
const deliveryStatuses = ['Preparing', 'Out for Delivery', 'Delivered'];
const paymentOptions = [
  { value: 'GCash', label: 'GCash', detail: 'Scan the GCash QR and send the payment reference with your booking.' },
  { value: 'Bank Transfer', label: 'Bank transfer', detail: 'Scan the bank QR and send the transaction reference with your booking.' },
  { value: 'On-hand Payment', label: 'On-hand payment', detail: 'Pay directly to the KYURT team during delivery or setup.' }
];

function peso(value) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(value || 0));
}

function hoursBetween(start, end) {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60)) || 1);
}

function unitForDuration(product, hours) {
  if (hours >= 24 && Number(product.price_per_day) > 0) {
    return Math.ceil(hours / 24) * Number(product.price_per_day);
  }
  return hours * Number(product.price_per_hour);
}

function localDateKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function monthLabel(value) {
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(value);
}

function statusClass(status) {
  const map = {
    Pending: 'bg-amber-100 text-amber-700',
    Approved: 'bg-cyan-100 text-cyan-700',
    Rejected: 'bg-rose-100 text-rose-700',
    Paid: 'bg-emerald-100 text-emerald-700',
    Completed: 'bg-slate-900 text-white',
    Cancelled: 'bg-slate-100 text-slate-600'
  };
  return map[status] || 'bg-slate-100 text-slate-600';
}

function StatusBadge({ status }) {
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(status)}`}>{status}</span>;
}

function deliveryStatusClass(status) {
  const map = {
    Preparing: 'bg-indigo-100 text-indigo-700',
    'Out for Delivery': 'bg-cyan-100 text-cyan-700',
    Delivered: 'bg-emerald-100 text-emerald-700'
  };
  return map[status] || 'bg-slate-100 text-slate-600';
}

function DeliveryBadge({ status }) {
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${deliveryStatusClass(status)}`}>{status || 'Preparing'}</span>;
}

function NotificationBadge({ count }) {
  const value = Number(count || 0);
  if (!value) return null;
  return <span className="ml-2 inline-grid min-w-5 place-items-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-black leading-none text-white">{value > 99 ? '99+' : value}</span>;
}

function PaymentQrPreview({ method, total }) {
  const online = method === 'GCash' || method === 'Bank Transfer';
  const seed = method.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const cells = Array.from({ length: 49 }, (_, index) => {
    const row = Math.floor(index / 7);
    const col = index % 7;
    const finder = (row < 2 && col < 2) || (row < 2 && col > 4) || (row > 4 && col < 2);
    return finder || ((index * 17 + seed) % 5 < 2);
  });

  if (!online) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        On-hand payment selected. No QR code is needed.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-4">
        <div className="grid h-28 w-28 shrink-0 grid-cols-7 gap-1 rounded-md border border-slate-200 bg-white p-2">
          {cells.map((active, index) => <span key={index} className={active ? 'rounded-[1px] bg-ink' : 'rounded-[1px] bg-white'} />)}
        </div>
        <div>
          <p className="text-sm font-black text-ink">{method} QR</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">Amount due: <strong>{peso(total)}</strong></p>
          <p className="mt-1 text-xs leading-5 text-slate-500">Enter your reference number after payment so admin can verify it.</p>
        </div>
      </div>
    </div>
  );
}

function DeliveryTracker({ status }) {
  const current = deliveryStatuses.indexOf(status || 'Preparing');
  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-3">
      {deliveryStatuses.map((step, index) => {
        const complete = index <= current;
        return (
          <div key={step} className={`rounded-lg border p-3 ${complete ? 'border-cyan-200 bg-cyan-50 text-ink' : 'border-slate-200 bg-white text-slate-500'}`}>
            <div className="flex items-center gap-2">
              <span className={`grid h-7 w-7 place-items-center rounded-full ${complete ? 'bg-cyan-500 text-navy' : 'bg-slate-100 text-slate-400'}`}>
                {complete ? <CheckCircle2 size={16} /> : index + 1}
              </span>
              <span className="text-sm font-bold">{step}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Reveal({ as: Tag = 'div', children, className = '', direction = 'left', delay = 0 }) {
  const ref = useRef(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          node.classList.add('is-visible');
          observer.unobserve(node);
        }
      },
      { threshold: 0.18, rootMargin: '0px 0px -8% 0px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag ref={ref} className={`reveal reveal-${direction} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </Tag>
  );
}

function Layout({ page, setPage }) {
  const { user, logout } = useAuth();
  const { items } = useCart();
  const [open, setOpen] = useState(false);
  const [adminNotifications, setAdminNotifications] = useState({});

  useEffect(() => {
    if (user?.role !== 'admin') {
      setAdminNotifications({});
      return undefined;
    }

    let active = true;
    api('/reports/summary')
      .then((data) => {
        if (active) setAdminNotifications(data.notifications || {});
      })
      .catch(console.error);
    return () => {
      active = false;
    };
  }, [user]);

  const customerNav = [
    ['home', 'Home'],
    ['browse', 'Browse'],
    ['cart', `Cart (${items.length})`],
    ['dashboard', 'My Bookings']
  ];
  const adminNav = [
    ['admin', 'Dashboard', 0],
    ['admin-products', 'Products'],
    ['admin-bookings', 'Bookings', adminNotifications.pending_bookings],
    ['admin-reports', 'Reports', adminNotifications.reportable_bookings],
    ['admin-calendar', 'Calendar', adminNotifications.upcoming_calendar]
  ];
  const nav = user?.role === 'admin' ? adminNav : customerNav;

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-navy/95 text-white backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <button className="flex items-center gap-3" onClick={() => setPage('home')}>
          <span className="grid h-10 w-10 place-items-center rounded-md bg-cyan-400 font-black text-navy">A</span>
          <span>
            <span className="block text-lg font-black tracking-wide">KYURT</span>
            <span className="hidden text-xs text-cyan-100 sm:block">Premium event electronics</span>
          </span>
        </button>
        <nav className="hidden items-center gap-1 lg:flex">
          {nav.map(([key, label, count]) => (
            <button key={key} onClick={() => setPage(key)} className={`rounded-md px-3 py-2 text-sm font-semibold transition ${page === key ? 'bg-white text-navy' : 'text-cyan-50 hover:bg-white/10'}`}>
              {label}
              <NotificationBadge count={count} />
            </button>
          ))}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          {user ? (
            <>
              <span className="rounded-full bg-white/10 px-3 py-1.5 text-sm">{user.name}</span>
              <button className="btn-secondary border-white/20 bg-white/10 text-white hover:text-white" onClick={logout}><LogOut size={16} /> Logout</button>
            </>
          ) : (
            <button className="btn-primary" onClick={() => setPage('login')}><User size={16} /> Login</button>
          )}
        </div>
        <button className="rounded-md p-2 lg:hidden" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
      </div>
      {open && (
        <div className="border-t border-white/10 px-4 py-3 lg:hidden">
          {nav.map(([key, label, count]) => (
            <button key={key} onClick={() => { setPage(key); setOpen(false); }} className="block w-full rounded-md px-3 py-2 text-left text-sm font-semibold hover:bg-white/10">
              {label}
              <NotificationBadge count={count} />
            </button>
          ))}
          {user ? <button className="mt-2 block w-full rounded-md px-3 py-2 text-left text-sm font-semibold hover:bg-white/10" onClick={logout}>Logout</button> : <button className="mt-2 block w-full rounded-md px-3 py-2 text-left text-sm font-semibold hover:bg-white/10" onClick={() => setPage('login')}>Login</button>}
        </div>
      )}
    </header>
  );
}

function Hero({ setPage }) {
  return (
    <section className="relative overflow-hidden bg-navy text-white">
      <div className="absolute inset-0 opacity-45">
        <img className="h-full w-full object-cover" src="/images/home-speaker-background.png" alt="Speaker with sound wave background" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/90 to-ink/50" />
      <div className="relative mx-auto grid min-h-[620px] max-w-7xl content-center px-4 py-16">
        <div className="max-w-3xl animate-hero-copy">
          <span className="inline-flex items-center gap-2 rounded-full bg-cyan-400/15 px-4 py-2 text-sm font-semibold text-cyan-100 ring-1 ring-cyan-300/30"><Sparkles size={16} /> Event-grade rentals, managed end to end</span>
          <h1 className="mt-6 text-5xl font-black leading-tight md:text-7xl">KYURT</h1>
          <p className="mt-5 max-w-2xl text-xl leading-8 text-cyan-50">Powering Events with Premium Sound & Visual Experience.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button className="btn-primary" onClick={() => setPage('browse')}><Package size={18} /> Browse Equipment</button>
            <button className="btn-secondary border-white/20 bg-white/10 text-white hover:text-white" onClick={() => setPage('cart')}><ShoppingCart size={18} /> Start Booking</button>
          </div>
        </div>
      </div>
    </section>
  );
}

function HomePage({ setPage }) {
  const featureCards = [
    ['Sound Systems', 'Concert-ready line arrays, mixers, subs, and powered speaker kits.'],
    ['Visuals', 'LED walls, projectors, and display packages for immersive stages.'],
    ['Production Support', 'Setup crews and technicians available for reliable execution.']
  ];
  const eventSetups = [
    ['Corporate conference', 'LED wall, stage wash, wireless mics, and front-of-house sound.', 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80'],
    ['Outdoor concert', 'Line array audio, moving beams, subs, and technician support.', 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&w=1200&q=80'],
    ['Wedding reception', 'Warm lighting, DJ speakers, projector playback, and ambient coverage.', 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1200&q=80'],
    ['Product launch', 'Clean stage visuals, podium audio, display screens, and show control.', 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80']
  ];
  const blogPosts = [
    ['How to choose the right sound system for your venue', 'Match speaker coverage, guest count, and room shape before you book.', '4 min read', 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=1200&q=80'],
    ['LED wall or projector: what fits your event better?', 'A quick guide for conferences, launches, concerts, and indoor programs.', '3 min read', 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80'],
    ['Setup checklist before event day', 'Power, access, load-in time, staging, and crew details that keep events smooth.', '5 min read', 'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=1200&q=80']
  ];

  return (
    <>
      <Hero setPage={setPage} />
      <main className="mx-auto max-w-7xl px-4 py-14">
        <div className="grid gap-4 md:grid-cols-3">
          {featureCards.map(([title, text], index) => (
            <Reveal as="article" key={title} direction="up" delay={index * 110} className="panel p-6 transition hover:-translate-y-1 hover:shadow-glow">
              <h3 className="text-lg font-black text-ink">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{text}</p>
            </Reveal>
          ))}
        </div>
        <Reveal as="section" direction="left" className="mt-14 grid gap-8 lg:grid-cols-[1fr_0.9fr]">
          <div className="reveal-text-group">
            <p className="text-sm font-bold uppercase tracking-wider text-cyan-600">Premium control</p>
            <h2 className="mt-2 text-3xl font-black text-ink">Book event electronics with availability, delivery, and service support in one flow.</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {['Real-time quantity checks', 'Manual payment tracking', 'Admin approval queue', 'Sales and calendar views'].map((item, index) => (
              <Reveal key={item} direction="up" delay={index * 90} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-700">
                <CheckCircle2 className="text-cyan-500" size={18} /> {item}
              </Reveal>
            ))}
          </div>
        </Reveal>
        <Reveal as="section" direction="left" className="mt-14">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-cyan-600">Event setups</p>
              <h2 className="mt-2 text-3xl font-black text-ink">See how KYURT equipment looks in real event environments.</h2>
            </div>
            <button className="btn-primary w-fit" onClick={() => setPage('browse')}><Package size={18} /> Explore packages</button>
          </div>
          <div className="mt-6 grid gap-6">
            {eventSetups.map(([title, text, image], index) => (
              <article key={title} className="grid overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm lg:grid-cols-[0.8fr_1.2fr]">
                <Reveal direction="left" delay={index * 90} className="flex flex-col justify-center p-6 lg:p-8">
                  <p className="text-xs font-bold uppercase tracking-wide text-cyan-600">Setup {index + 1}</p>
                  <h3 className="mt-2 text-2xl font-black text-ink">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{text}</p>
                </Reveal>
                <div className="order-first overflow-hidden lg:order-none">
                  <Reveal direction="up" delay={index * 90 + 120} className="h-full">
                    <img className="h-72 w-full object-cover transition duration-700 hover:scale-105 lg:h-80" src={image} alt={title} />
                  </Reveal>
                </div>
              </article>
            ))}
          </div>
        </Reveal>
        <Reveal as="section" direction="left" className="mt-14">
          <div className="reveal-text-group">
            <p className="text-sm font-bold uppercase tracking-wider text-cyan-600">Event notes</p>
            <h2 className="mt-2 text-3xl font-black text-ink">Helpful reads before planning your next setup.</h2>
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {blogPosts.map(([title, text, readTime, image], index) => (
              <Reveal as="article" key={title} direction="up" delay={index * 120} className="panel overflow-hidden transition hover:-translate-y-1 hover:shadow-glow">
                <img className="h-56 w-full object-cover" src={image} alt={title} />
                <div className="p-5">
                  <p className="text-xs font-bold uppercase tracking-wide text-cyan-600">{readTime}</p>
                  <h3 className="mt-2 text-lg font-black leading-6 text-ink">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </Reveal>
        <Reveal direction="up"><CustomerFooter /></Reveal>
      </main>
    </>
  );
}

function ProductCard({ product, onAdd, onView }) {
  const imageUrl = product.image_url || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80';

  return (
    <article className="panel overflow-hidden transition hover:-translate-y-1 hover:shadow-glow">
      <img src={imageUrl} alt={product.name} className="h-48 w-full object-cover" />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-cyan-600">{product.category}</p>
            <h3 className="mt-1 text-lg font-black text-ink">{product.name}</h3>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{product.stock_quantity} in stock</span>
        </div>
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{product.description}</p>
        <div className="mt-5 flex items-center justify-between">
          <div>
            <p className="text-lg font-black text-ink">{peso(product.price_per_hour)}</p>
            <p className="text-xs text-slate-500">per hour</p>
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary px-3" onClick={() => onView(product)}>Details</button>
            <button className="btn-primary px-3" onClick={() => onAdd(product)}><Plus size={16} /> Add</button>
          </div>
        </div>
      </div>
    </article>
  );
}

function BrowsePage({ setPage }) {
  const { addItem } = useCart();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(['All', ...defaultCategories]);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    api('/products/categories')
      .then((data) => setCategories(['All', ...new Set([...defaultCategories, ...(data.categories || [])])]))
      .catch(console.error);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (category !== 'All') params.set('category', category);
    if (search) params.set('search', search);
    api(`/products?${params}`).then((data) => setProducts(data.products)).catch(console.error);
  }, [category, search]);

  function addToCart(product) {
    addItem(product);
    setNotice(`${product.name} added to cart.`);
  }

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(''), 2500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      {notice && (
        <div className="fixed right-4 top-20 z-50 flex max-w-sm items-center gap-3 rounded-lg border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-ink shadow-lg">
          <CheckCircle2 size={18} className="shrink-0 text-emerald-500" />
          <span>{notice}</span>
        </div>
      )}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-cyan-600">Equipment catalog</p>
          <h1 className="mt-2 text-4xl font-black text-ink">Browse rentals</h1>
        </div>
        <label className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
          <input className="input input-with-icon" placeholder="Search equipment" value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
      </div>
      <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
        {categories.map((item) => (
          <button key={item} className={`shrink-0 rounded-md px-4 py-2 text-sm font-semibold transition ${category === item ? 'bg-ink text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:ring-cyan-300'}`} onClick={() => setCategory(item)}>{item}</button>
        ))}
      </div>
      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => <ProductCard key={product.id} product={product} onView={setSelected} onAdd={addToCart} />)}
      </div>
      {selected && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-navy/70 p-4" onClick={() => setSelected(null)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-lg bg-white" onClick={(event) => event.stopPropagation()}>
            <img className="h-72 w-full object-cover" src={selected.image_url || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80'} alt={selected.name} />
            <div className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold uppercase tracking-wider text-cyan-600">{selected.category}</p>
                  <h2 className="mt-1 text-3xl font-black text-ink">{selected.name}</h2>
                </div>
                <button className="rounded-md p-2 hover:bg-slate-100" onClick={() => setSelected(null)}><X /></button>
              </div>
              <p className="mt-4 leading-7 text-slate-600">{selected.description}</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-slate-50 p-4"><p className="text-xs text-slate-500">Hourly</p><p className="font-black text-ink">{peso(selected.price_per_hour)}</p></div>
                <div className="rounded-lg bg-slate-50 p-4"><p className="text-xs text-slate-500">Daily</p><p className="font-black text-ink">{peso(selected.price_per_day)}</p></div>
                <div className="rounded-lg bg-slate-50 p-4"><p className="text-xs text-slate-500">Available</p><p className="font-black text-ink">{selected.stock_quantity}</p></div>
              </div>
              <button className="btn-primary mt-6 w-full" onClick={() => { addToCart(selected); setSelected(null); }}>Add to booking cart</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function CartPage({ setPage }) {
  const { items, updateQuantity, removeItem, clearCart } = useCart();
  const { user } = useAuth();
  const [form, setForm] = useState({
    start_datetime: '',
    end_datetime: '',
    delivery_location: '',
    setup_needed: true,
    technician_needed: false,
    payment_method: 'GCash',
    reference_number: '',
    notes: ''
  });
  const [message, setMessage] = useState('');
  const hours = form.start_datetime && form.end_datetime ? hoursBetween(form.start_datetime, form.end_datetime) : 1;
  const subtotal = items.reduce((sum, item) => sum + unitForDuration(item.product, hours) * item.quantity, 0);
  const serviceFee = (form.setup_needed ? 1500 : 0) + (form.technician_needed ? 2500 : 0);
  const total = subtotal + serviceFee;

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function checkout() {
    setMessage('');
    if (!user) {
      setPage('login');
      return;
    }

    try {
      const booking = await api('/bookings', {
        method: 'POST',
        body: {
          ...form,
          items: items.map((item) => ({ product_id: item.product.id, quantity: item.quantity }))
        }
      });
      await api('/payments', {
        method: 'POST',
        body: {
          booking_id: booking.id,
          method: form.payment_method,
          reference_number: form.reference_number
        }
      });
      clearCart();
      setMessage('Booking submitted. Your payment selection is now pending admin verification.');
      setPage('dashboard');
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <main className="mx-auto grid max-w-7xl gap-6 px-4 py-10 lg:grid-cols-[1fr_380px]">
      <section>
        <h1 className="text-4xl font-black text-ink">Booking cart</h1>
        <div className="mt-6 space-y-4">
          {items.length === 0 && <div className="panel p-8 text-center text-slate-600">Your cart is empty.</div>}
          {items.map((item) => (
            <div key={item.product.id} className="panel flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
              <img className="h-28 w-full rounded-md object-cover sm:w-36" src={item.product.image_url} alt={item.product.name} />
              <div className="flex-1">
                <p className="text-xs font-bold uppercase tracking-wide text-cyan-600">{item.product.category}</p>
                <h3 className="font-black text-ink">{item.product.name}</h3>
                <p className="text-sm text-slate-500">{peso(unitForDuration(item.product, hours))} for selected duration</p>
              </div>
              <input className="input w-24" type="number" min="1" value={item.quantity} onChange={(event) => updateQuantity(item.product.id, event.target.value)} />
              <button className="rounded-md p-2 text-rose-600 hover:bg-rose-50" onClick={() => removeItem(item.product.id)}><Trash2 size={18} /></button>
            </div>
          ))}
        </div>
      </section>
      <aside className="panel h-fit p-5">
        <h2 className="text-xl font-black text-ink">Checkout</h2>
        <div className="mt-4 grid gap-3">
          <label className="text-sm font-semibold text-slate-700">Start date/time<input className="input mt-1" type="datetime-local" value={form.start_datetime} onChange={(event) => update('start_datetime', event.target.value)} /></label>
          <label className="text-sm font-semibold text-slate-700">End date/time<input className="input mt-1" type="datetime-local" value={form.end_datetime} onChange={(event) => update('end_datetime', event.target.value)} /></label>
          <label className="text-sm font-semibold text-slate-700">Delivery location<input className="input mt-1" value={form.delivery_location} onChange={(event) => update('delivery_location', event.target.value)} placeholder="Venue address" /></label>
          <label className="flex items-center gap-3 text-sm font-semibold text-slate-700"><input type="checkbox" checked={form.setup_needed} onChange={(event) => update('setup_needed', event.target.checked)} /> Setup needed</label>
          <label className="flex items-center gap-3 text-sm font-semibold text-slate-700"><input type="checkbox" checked={form.technician_needed} onChange={(event) => update('technician_needed', event.target.checked)} /> Technician needed</label>
          <label className="text-sm font-semibold text-slate-700">
            Payment method
            <select className="input mt-1" value={form.payment_method} onChange={(event) => update('payment_method', event.target.value)}>
              {paymentOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <PaymentQrPreview method={form.payment_method} total={total} />
          {form.payment_method !== 'On-hand Payment' && (
            <input className="input" value={form.reference_number} onChange={(event) => update('reference_number', event.target.value)} placeholder="Payment reference number" />
          )}
          <p className="rounded-lg bg-cyan-50 p-3 text-xs leading-5 text-ink">
            {paymentOptions.find((option) => option.value === form.payment_method)?.detail}
          </p>
          <textarea className="input min-h-24" value={form.notes} onChange={(event) => update('notes', event.target.value)} placeholder="Notes for the KYURT team" />
        </div>
        <div className="mt-5 space-y-2 border-t border-slate-200 pt-4 text-sm">
          <div className="flex justify-between"><span>Rental subtotal</span><strong>{peso(subtotal)}</strong></div>
          <div className="flex justify-between"><span>Service fees</span><strong>{peso(serviceFee)}</strong></div>
          <div className="flex justify-between text-lg text-ink"><span>Total</span><strong>{peso(total)}</strong></div>
        </div>
        {message && <p className="mt-3 rounded-md bg-cyan-50 p-3 text-sm text-ink">{message}</p>}
        <button className="btn-primary mt-5 w-full" disabled={!items.length} onClick={checkout}><CreditCard size={18} /> Submit Booking</button>
      </aside>
    </main>
  );
}

function LoginPage({ setPage }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setError('');
    try {
      const user = mode === 'login' ? await login(form.email, form.password) : await register(form);
      setPage(user.role === 'admin' ? 'admin' : 'dashboard');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="grid min-h-[calc(100vh-66px)] place-items-center bg-slate-50 px-4 py-10">
      <form className="panel w-full max-w-md p-6" onSubmit={submit}>
        <h1 className="text-3xl font-black text-ink">{mode === 'login' ? 'Welcome back' : 'Create account'}</h1>
        <p className="mt-2 text-sm text-slate-600">Access your bookings or manage KYURT operations.</p>
        <div className="mt-6 grid gap-3">
          {mode === 'register' && <input className="input" placeholder="Full name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />}
          <input className="input" type="email" placeholder="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          {mode === 'register' && <input className="input" placeholder="Phone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />}
          <input className="input" type="password" placeholder="Password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
        </div>
        {error && <p className="mt-3 rounded-md bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        <button className="btn-primary mt-5 w-full">{mode === 'login' ? 'Login' : 'Register'}</button>
        <button type="button" className="mt-4 w-full text-sm font-semibold text-cyan-700" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? 'Need an account? Register' : 'Already have an account? Login'}
        </button>
      </form>
    </main>
  );
}

function CustomerFooter() {
  const contacts = [
    [MapPin, 'Cebu City, Philippines'],
    [Phone, '+63 900 000 0000'],
    [Mail, 'hello@kyurt.test']
  ];
  const socials = [
    [Facebook, 'Facebook', 'https://facebook.com/kyurt'],
    [Instagram, 'Instagram', 'https://instagram.com/kyurt']
  ];

  return (
    <footer className="mt-10 overflow-hidden rounded-lg bg-navy text-white">
      <div className="grid gap-8 px-5 py-8 md:grid-cols-[1.2fr_1fr_1fr] md:px-8">
        <div>
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-md bg-cyan-400 font-black text-navy">A</span>
            <div>
              <h2 className="font-black tracking-wide">KYURT</h2>
              <p className="text-sm text-cyan-100">Premium event electronics</p>
            </div>
          </div>
          <p className="mt-4 max-w-md text-sm leading-6 text-slate-200">
            Powering events with reliable sound, lighting, visuals, delivery tracking, and production support.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-black uppercase tracking-wide text-cyan-200">Company Info</h3>
          <div className="mt-4 grid gap-3 text-sm text-slate-200">
            {contacts.map(([Icon, label]) => (
              <div key={label} className="flex items-center gap-3">
                <Icon size={18} className="shrink-0 text-cyan-300" />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-black uppercase tracking-wide text-cyan-200">Socials</h3>
          <div className="mt-4 flex flex-wrap gap-2">
            {socials.map(([Icon, label, href]) => (
              <a key={label} className="inline-flex items-center gap-2 rounded-md border border-white/15 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-300 hover:bg-white/10" href={href} target="_blank" rel="noreferrer">
                <Icon size={17} />
                {label}
              </a>
            ))}
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 px-5 py-4 text-sm text-cyan-100 md:px-8">
        © 2026 KYURT. All rights reserved.
      </div>
    </footer>
  );
}

function CustomerDashboard() {
  const [bookings, setBookings] = useState([]);
  useEffect(() => {
    api('/bookings/my').then((data) => setBookings(data.bookings)).catch(console.error);
  }, []);
  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-cyan-600">Order tracking</p>
          <h1 className="mt-2 text-4xl font-black text-ink">My bookings</h1>
        </div>
        <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
          <Truck size={18} className="text-cyan-500" />
          Track delivery progress
        </div>
      </div>
      <div className="mt-6 grid gap-4">
        {bookings.length === 0 && <div className="panel p-8 text-center text-slate-600">No bookings yet.</div>}
        {bookings.map((booking) => (
          <article key={booking.id} className="panel p-5">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-black text-ink">Booking #{booking.id}</h2>
                  <StatusBadge status={booking.status} />
                  <DeliveryBadge status={booking.delivery_status} />
                </div>
                <p className="mt-2 text-sm text-slate-600">{new Date(booking.start_datetime).toLocaleString()}</p>
                <p className="mt-1 text-sm text-slate-500">{booking.delivery_location}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 lg:min-w-[360px]">
                <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Items</p><p className="font-black text-ink">{booking.item_count}</p></div>
                <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Total</p><p className="font-black text-ink">{peso(booking.total_amount)}</p></div>
                <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Delivery</p><p className="font-black text-ink">{booking.delivery_status || 'Preparing'}</p></div>
              </div>
            </div>
            <DeliveryTracker status={booking.delivery_status} />
          </article>
        ))}
      </div>
      <CustomerFooter />
    </main>
  );
}

function AdminDashboard({ setPage }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    api('/reports/summary').then(setData).catch(console.error);
  }, []);
  const cards = [
    ['Revenue', peso(data?.summary?.revenue), BarChart3],
    ['Bookings', data?.summary?.total_bookings || 0, ClipboardList],
    ['Products', data?.summary?.total_products || 0, Package],
    ['Customers', data?.summary?.total_customers || 0, User]
  ];
  const notifications = [
    ['Bookings', data?.notifications?.pending_bookings || 0, 'Pending bookings need review', 'admin-bookings'],
    ['Reports', data?.notifications?.reportable_bookings || 0, 'Paid or completed bookings in reports', 'admin-reports'],
    ['Calendar', data?.notifications?.upcoming_calendar || 0, 'Upcoming active scheduled bookings', 'admin-calendar']
  ];
  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-4xl font-black text-ink">Admin dashboard</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-4">
        {cards.map(([label, value, Icon]) => (
          <div key={label} className="panel p-5">
            <Icon className="text-cyan-500" />
            <p className="mt-4 text-sm text-slate-500">{label}</p>
            <p className="text-2xl font-black text-ink">{value}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {notifications.map(([label, value, detail, target]) => (
          <button key={label} className="panel flex items-center justify-between gap-4 p-5 text-left transition hover:-translate-y-1 hover:shadow-glow" onClick={() => setPage(target)}>
            <div>
              <p className="text-sm font-black uppercase tracking-wide text-cyan-600">{label}</p>
              <p className="mt-1 text-sm text-slate-600">{detail}</p>
            </div>
            <span className="grid h-12 min-w-12 place-items-center rounded-full bg-rose-100 px-3 text-xl font-black text-rose-700">{value}</span>
          </button>
        ))}
      </div>
      <div className="panel mt-6 p-5">
        <h2 className="text-xl font-black text-ink">Status breakdown</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {(data?.statuses || []).map((item) => (
            <div key={item.status} className="flex items-center justify-between rounded-lg bg-slate-50 p-4">
              <StatusBadge status={item.status} />
              <strong>{item.count}</strong>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

function AdminProducts() {
  const empty = { name: '', category: 'Sound Systems', description: '', price_per_hour: '', price_per_day: '', stock_quantity: 1, image_url: '', specs: {} };
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(empty);
  const [categories, setCategories] = useState(defaultCategories);
  const [newCategory, setNewCategory] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  function load() {
    api('/products?includeInactive=true').then((data) => setProducts(data.products)).catch(console.error);
  }
  function loadCategories() {
    api('/products/categories?includeInactive=true')
      .then((data) => setCategories([...new Set([...defaultCategories, ...(data.categories || [])])]))
      .catch(console.error);
  }
  useEffect(() => {
    load();
    loadCategories();
  }, []);

  async function save(event) {
    event.preventDefault();
    setError('');
    const category = form.category === '__new__' ? newCategory.trim() : form.category;
    if (!category) {
      setError('Enter a category name before saving.');
      return;
    }

    try {
      setSaving(true);
      await api(form.id ? `/products/${form.id}` : '/products', { method: form.id ? 'PUT' : 'POST', body: { ...form, category } });
      setForm(empty);
      setNewCategory('');
      load();
      loadCategories();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function archive(id) {
    await api(`/products/${id}`, { method: 'DELETE' });
    load();
  }

  async function attachImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError('');
    try {
      setUploading(true);
      const data = await uploadProductImage(file);
      setForm((current) => ({ ...current, image_url: data.image_url }));
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }

  function editProduct(product) {
    setForm(product);
    setNewCategory('');
    setError('');
  }

  return (
    <main className="mx-auto grid max-w-7xl gap-6 px-4 py-10 lg:grid-cols-[380px_1fr]">
      <form className="panel h-fit p-5" onSubmit={save}>
        <h1 className="text-2xl font-black text-ink">{form.id ? 'Edit product' : 'New product'}</h1>
        <div className="mt-4 grid gap-3">
          <input className="input" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {categories.map((category) => <option key={category}>{category}</option>)}
            <option value="__new__">Add new category...</option>
          </select>
          {form.category === '__new__' && (
            <input className="input" placeholder="New category name" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} />
          )}
          <textarea className="input min-h-24" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <input className="input" type="number" placeholder="Price per hour" value={form.price_per_hour} onChange={(e) => setForm({ ...form, price_per_hour: e.target.value })} />
          <input className="input" type="number" placeholder="Price per day" value={form.price_per_day} onChange={(e) => setForm({ ...form, price_per_day: e.target.value })} />
          <input className="input" type="number" placeholder="Stock" value={form.stock_quantity} onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })} />
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-700 transition hover:border-cyan-300 hover:bg-cyan-50">
            <Upload size={18} className="text-cyan-600" />
            {uploading ? 'Uploading photo...' : 'Attach product photo'}
            <input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={attachImage} disabled={uploading} />
          </label>
          {form.image_url && (
            <div className="overflow-hidden rounded-md border border-slate-200">
              <img className="h-36 w-full object-cover" src={form.image_url} alt={form.name || 'Product preview'} />
              <input className="input rounded-none border-0 border-t border-slate-200" placeholder="Image URL" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
            </div>
          )}
        </div>
        {error && <p className="mt-3 rounded-md bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        <button className="btn-primary mt-4 w-full" disabled={saving || uploading}>{saving ? 'Saving...' : 'Save product'}</button>
      </form>
      <section className="panel overflow-hidden">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-500"><tr><th className="p-4">Product</th><th className="p-4">Category</th><th className="p-4">Stock</th><th className="p-4">Rate</th><th className="p-4">Actions</th></tr></thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-t border-slate-100">
                <td className="p-4 font-bold text-ink">{product.name}</td>
                <td className="p-4">{product.category}</td>
                <td className="p-4">{product.stock_quantity}</td>
                <td className="p-4">{peso(product.price_per_hour)}/hr</td>
                <td className="p-4"><button className="mr-2 text-cyan-700 font-semibold" onClick={() => editProduct(product)}>Edit</button><button className="text-rose-600 font-semibold" onClick={() => archive(product.id)}>Archive</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}

function AdminBookings() {
  const [bookings, setBookings] = useState([]);
  const [payment, setPayment] = useState({ booking_id: '', amount: '', method: 'Manual', reference_number: '', status: 'Verified' });
  function load() {
    api('/bookings').then((data) => setBookings(data.bookings)).catch(console.error);
  }
  useEffect(load, []);

  async function updateStatus(id, status) {
    await api(`/bookings/${id}/status`, { method: 'PATCH', body: { status } });
    load();
  }

  async function updateDeliveryStatus(id, delivery_status) {
    await api(`/bookings/${id}/delivery-status`, { method: 'PATCH', body: { delivery_status } });
    load();
  }

  async function recordPayment(event) {
    event.preventDefault();
    await api('/payments', { method: 'POST', body: payment });
    setPayment({ booking_id: '', amount: '', method: 'Manual', reference_number: '', status: 'Verified' });
    load();
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-4xl font-black text-ink">Manage bookings</h1>
      <form className="panel mt-6 grid gap-3 p-4 md:grid-cols-5" onSubmit={recordPayment}>
        <input className="input" placeholder="Booking ID" value={payment.booking_id} onChange={(e) => setPayment({ ...payment, booking_id: e.target.value })} />
        <input className="input" placeholder="Amount" type="number" value={payment.amount} onChange={(e) => setPayment({ ...payment, amount: e.target.value })} />
        <input className="input" placeholder="Method" value={payment.method} onChange={(e) => setPayment({ ...payment, method: e.target.value })} />
        <input className="input" placeholder="Reference" value={payment.reference_number} onChange={(e) => setPayment({ ...payment, reference_number: e.target.value })} />
        <button className="btn-primary">Record payment</button>
      </form>
      <div className="panel mt-6 overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-500"><tr><th className="p-4">Booking</th><th className="p-4">Customer</th><th className="p-4">Schedule</th><th className="p-4">Total</th><th className="p-4">Status</th><th className="p-4">Delivery</th><th className="p-4">Update</th></tr></thead>
          <tbody>
            {bookings.map((booking) => (
              <tr key={booking.id} className="border-t border-slate-100">
                <td className="p-4 font-bold text-ink">#{booking.id}</td>
                <td className="p-4">{booking.customer_name}<br /><span className="text-xs text-slate-500">{booking.customer_email}</span></td>
                <td className="p-4">{new Date(booking.start_datetime).toLocaleString()}</td>
                <td className="p-4 font-bold">{peso(booking.total_amount)}</td>
                <td className="p-4"><StatusBadge status={booking.status} /></td>
                <td className="p-4"><DeliveryBadge status={booking.delivery_status} /></td>
                <td className="p-4">
                  <div className="grid min-w-44 gap-2">
                    <select className="input" value={booking.status} onChange={(e) => updateStatus(booking.id, e.target.value)}>{statuses.map((s) => <option key={s}>{s}</option>)}</select>
                    <select className="input" value={booking.delivery_status || 'Preparing'} onChange={(e) => updateDeliveryStatus(booking.id, e.target.value)}>{deliveryStatuses.map((s) => <option key={s}>{s}</option>)}</select>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function AdminReports() {
  const [data, setData] = useState({ monthly: [], popular: [] });
  const [selectedMonth, setSelectedMonth] = useState('');
  const [monthDetails, setMonthDetails] = useState({ orders: [], summary: { total_sales: 0, bookings: 0 } });
  const [loadingMonth, setLoadingMonth] = useState(false);

  useEffect(() => {
    api('/reports/sales')
      .then((result) => {
        setData(result);
        if (result.monthly?.[0]?.month) {
          setSelectedMonth(result.monthly[0].month);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedMonth) return undefined;
    setLoadingMonth(true);
    api(`/reports/sales/${selectedMonth}`)
      .then(setMonthDetails)
      .catch(console.error)
      .finally(() => setLoadingMonth(false));
  }, [selectedMonth]);

  return (
    <main className="mx-auto grid max-w-7xl gap-6 px-4 py-10 xl:grid-cols-[1.25fr_0.75fr]">
      <section className="panel overflow-hidden">
        <div className="border-b border-slate-100 p-5">
          <h1 className="text-2xl font-black text-ink">Monthly sales</h1>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {data.monthly.map((row) => (
              <button key={row.month} className={`shrink-0 rounded-md px-4 py-2 text-sm font-semibold transition ${selectedMonth === row.month ? 'bg-ink text-white' : 'bg-slate-50 text-slate-700 ring-1 ring-slate-200 hover:ring-cyan-300'}`} onClick={() => setSelectedMonth(row.month)}>
                {row.month}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="p-4">Customer</th>
                <th className="p-4">Order</th>
                <th className="p-4">Date</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Money</th>
              </tr>
            </thead>
            <tbody>
              {loadingMonth && (
                <tr><td className="p-4 text-slate-500" colSpan="5">Loading month sales...</td></tr>
              )}
              {!loadingMonth && monthDetails.orders.length === 0 && (
                <tr><td className="p-4 text-slate-500" colSpan="5">No orders for this month.</td></tr>
              )}
              {!loadingMonth && monthDetails.orders.map((order) => (
                <tr key={order.id} className="border-t border-slate-100">
                  <td className="p-4 font-semibold text-ink">{order.customer_name}<br /><span className="text-xs font-normal text-slate-500">{order.customer_email}</span></td>
                  <td className="p-4">#{order.id}<br /><span className="text-xs text-slate-500">{order.item_count} items</span></td>
                  <td className="p-4">{new Date(order.created_at).toLocaleDateString()}</td>
                  <td className="p-4"><StatusBadge status={order.status} /></td>
                  <td className="p-4 text-right font-black text-ink">{peso(order.total_amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-slate-200 bg-slate-50">
              <tr>
                <td className="p-4 font-black text-ink" colSpan="4">Total sales for {selectedMonth || 'selected month'}</td>
                <td className="p-4 text-right text-lg font-black text-ink">{peso(monthDetails.summary?.total_sales)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
      <section className="panel p-5">
        <h2 className="text-2xl font-black text-ink">Popular equipment</h2>
        <div className="mt-4 space-y-3">
          {data.popular.map((row) => <div key={row.name} className="rounded-lg bg-slate-50 p-4"><strong className="text-ink">{row.name}</strong><p className="text-sm text-slate-500">{row.rented_quantity} units rented - {peso(row.rental_total)}</p></div>)}
        </div>
      </section>
    </main>
  );
}

function AdminCalendar() {
  const [bookings, setBookings] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(localDateKey(new Date()));

  useEffect(() => {
    api('/reports/calendar').then((data) => setBookings(data.bookings)).catch(console.error);
  }, []);

  const bookingsByDate = useMemo(() => {
    return bookings.reduce((groups, booking) => {
      const key = localDateKey(booking.start_datetime);
      if (!key) return groups;
      return { ...groups, [key]: [...(groups[key] || []), booking] };
    }, {});
  }, [bookings]);

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const start = new Date(firstDay);
    start.setDate(firstDay.getDate() - firstDay.getDay());

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const key = localDateKey(date);
      return {
        date,
        key,
        inMonth: date.getMonth() === month,
        bookings: bookingsByDate[key] || []
      };
    });
  }, [bookingsByDate, currentMonth]);

  const selectedBookings = bookingsByDate[selectedDate] || [];
  const monthBookings = calendarDays.filter((day) => day.inMonth).reduce((total, day) => total + day.bookings.length, 0);
  const monthRevenue = calendarDays
    .filter((day) => day.inMonth)
    .flatMap((day) => day.bookings)
    .reduce((total, booking) => total + Number(booking.total_amount || 0), 0);

  function moveMonth(offset) {
    setCurrentMonth((month) => new Date(month.getFullYear(), month.getMonth() + offset, 1));
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-cyan-600">Admin planning</p>
          <h1 className="mt-2 text-4xl font-black text-ink">Booking calendar</h1>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs font-semibold text-slate-500">Bookings this month</p>
            <p className="text-2xl font-black text-ink">{monthBookings}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs font-semibold text-slate-500">Scheduled value</p>
            <p className="text-2xl font-black text-ink">{peso(monthRevenue)}</p>
          </div>
        </div>
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_360px]">
        <section className="panel overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <CalendarDays className="text-cyan-500" size={24} />
              <h2 className="text-xl font-black text-ink">{monthLabel(currentMonth)}</h2>
            </div>
            <div className="flex gap-2">
              <button className="btn-secondary px-3" onClick={() => moveMonth(-1)} aria-label="Previous month"><ChevronLeft size={18} /></button>
              <button className="btn-secondary px-3" onClick={() => { const now = new Date(); setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1)); setSelectedDate(localDateKey(now)); }}>Today</button>
              <button className="btn-secondary px-3" onClick={() => moveMonth(1)} aria-label="Next month"><ChevronRight size={18} /></button>
            </div>
          </div>
          <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50 text-center text-xs font-bold uppercase tracking-wide text-slate-500">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <div key={day} className="p-3">{day}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {calendarDays.map((day) => {
              const active = selectedDate === day.key;
              return (
                <button key={day.key} className={`min-h-32 border-b border-r border-slate-100 p-2 text-left transition hover:bg-cyan-50 ${day.inMonth ? 'bg-white' : 'bg-slate-50 text-slate-400'} ${active ? 'ring-2 ring-inset ring-cyan-400' : ''}`} onClick={() => setSelectedDate(day.key)}>
                  <span className={`inline-grid h-7 w-7 place-items-center rounded-full text-sm font-black ${active ? 'bg-cyan-500 text-navy' : 'text-ink'}`}>{day.date.getDate()}</span>
                  <div className="mt-2 space-y-1">
                    {day.bookings.slice(0, 3).map((booking) => (
                      <div key={booking.id} className="truncate rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                        #{booking.id} {booking.customer_name}
                      </div>
                    ))}
                    {day.bookings.length > 3 && <div className="text-xs font-bold text-cyan-700">+{day.bookings.length - 3} more</div>}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
        <aside className="panel h-fit p-5">
          <p className="text-sm font-bold uppercase tracking-wider text-cyan-600">Selected day</p>
          <h2 className="mt-1 text-2xl font-black text-ink">{selectedDate ? new Date(`${selectedDate}T00:00:00`).toLocaleDateString() : 'Choose a date'}</h2>
          <div className="mt-5 space-y-3">
            {selectedBookings.length === 0 && <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">No bookings scheduled for this day.</p>}
            {selectedBookings.map((booking) => (
              <article key={booking.id} className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-ink">Booking #{booking.id}</p>
                    <p className="text-sm text-slate-600">{booking.customer_name}</p>
                    <p className="text-xs text-slate-500">{booking.customer_email}</p>
                  </div>
                  <StatusBadge status={booking.status} />
                </div>
                <div className="mt-3 space-y-1 text-sm text-slate-600">
                  <p>{new Date(booking.start_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} to {new Date(booking.end_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  <p>{booking.delivery_location}</p>
                  <p className="font-black text-ink">{peso(booking.total_amount)}</p>
                </div>
              </article>
            ))}
          </div>
        </aside>
      </div>
    </main>
  );
}

export default function App() {
  const [page, setPage] = useState('home');
  const { user, loading } = useAuth();

  const content = useMemo(() => {
    if (loading) return <main className="grid min-h-screen place-items-center text-ink">Loading KYURT...</main>;
    if (page === 'home') return <HomePage setPage={setPage} />;
    if (page === 'browse') return <BrowsePage setPage={setPage} />;
    if (page === 'cart') return <CartPage setPage={setPage} />;
    if (page === 'login') return <LoginPage setPage={setPage} />;
    if (page === 'dashboard') return user ? <CustomerDashboard /> : <LoginPage setPage={setPage} />;
    if (page === 'admin') return user?.role === 'admin' ? <AdminDashboard setPage={setPage} /> : <LoginPage setPage={setPage} />;
    if (page === 'admin-products') return user?.role === 'admin' ? <AdminProducts /> : <LoginPage setPage={setPage} />;
    if (page === 'admin-bookings') return user?.role === 'admin' ? <AdminBookings /> : <LoginPage setPage={setPage} />;
    if (page === 'admin-reports') return user?.role === 'admin' ? <AdminReports /> : <LoginPage setPage={setPage} />;
    if (page === 'admin-calendar') return user?.role === 'admin' ? <AdminCalendar /> : <LoginPage setPage={setPage} />;
    return <HomePage setPage={setPage} />;
  }, [page, user, loading]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Layout page={page} setPage={setPage} />
      {content}
    </div>
  );
}
