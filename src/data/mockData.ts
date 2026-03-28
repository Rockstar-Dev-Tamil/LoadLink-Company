import { 
  LayoutDashboard, 
  Package, 
  Truck, 
  MapPin, 
  CreditCard, 
  TrendingUp, 
  Leaf,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', id: 'dashboard' },
  { icon: Package, label: 'Book Shipment', id: 'bookings' },
  { icon: Truck, label: 'Truck Matches', id: 'matches' },
  { icon: MapPin, label: 'Tracking', id: 'tracking' },
  { icon: CreditCard, label: 'Payments', id: 'payments' },
  { icon: TrendingUp, label: 'Insights', id: 'insights' },
];

export const stats = [
  { label: 'Total Shipments', value: '1,284', change: '+8.4%', icon: Package, color: 'cyan' },
  { label: 'Active Deliveries', value: '42', subtext: 'In-transit right now', icon: Truck, color: 'purple' },
  { label: 'Cost Saved (₹)', value: '8.42L', subtext: 'AI Optimized', icon: TrendingUp, color: 'cyan' },
  { label: 'CO₂ Reduction (kg)', value: '3,120', subtext: '12 tons target', icon: Leaf, color: 'purple' },
];

export const smartMatches = [
  {
    id: 'M-101',
    provider: 'TransWorld Express',
    rating: 4.9,
    shipments: '2.4k',
    price: '₹41,200',
    eta: '16.5 Hours',
    matchScore: 98,
    route: 'Mumbai Hub → Bangalore Port'
  },
  {
    id: 'M-102',
    provider: 'Apex Logistics',
    rating: 4.7,
    shipments: '890',
    price: '₹39,800',
    eta: '20.2 Hours',
    matchScore: 92,
    route: 'Mumbai Hub → Bangalore Port'
  }
];

export const activeShipments = [
  {
    id: 'K-8829-X',
    status: 'In Transit',
    origin: 'Port of Singapore, Terminal 4',
    destination: 'Distribution Hub, Ho Chi Minh City',
    timeline: [
      { time: 'Oct 24, 08:30 AM', event: 'Departed Singapore Hub', status: 'completed' },
      { time: 'Currently Here', event: 'Arrived at South China Sea Checkpoint', status: 'active', insight: 'Vessel maintaining 18 knots. Expected ahead of schedule by 4h.' },
      { time: 'Est. Oct 26, 11:00 AM', event: 'Arrival Ho Chi Minh Port', status: 'pending' }
    ]
  }
];

export const payments = [
  { id: '#KIN-984210', service: 'Smart Match', date: 'Oct 24, 2023', amount: '$1,240.00', status: 'Paid' },
  { id: '#KIN-984211', service: 'Express Haul', date: 'Oct 26, 2023', amount: '$890.00', status: 'Pending' },
  { id: '#KIN-984215', service: 'Smart Match', date: 'Oct 27, 2023', amount: '$2,450.00', status: 'Paid' },
];

export const chartData = [
  { name: 'Jan', traditional: 4000, kinetic: 2400 },
  { name: 'Feb', traditional: 3000, kinetic: 1398 },
  { name: 'Mar', traditional: 2000, kinetic: 9800 },
  { name: 'Apr', traditional: 2780, kinetic: 3908 },
  { name: 'May', traditional: 1890, kinetic: 4800 },
  { name: 'Jun', traditional: 2390, kinetic: 3800 },
];
