import React, { useState, useEffect } from 'react';
import { Loader2, TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, UserCheck } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const PREMIUM_DARK_PALETTE = [
  '#FF2D55', // Neon Pink/Red (Matches LG Red Glow)
  '#5E5CE6', // Indigo (Matches BG Purple Glow)
  '#0A84FF', // Bright Blue
  '#32D74B', // Neon Green
  '#FF9F0A', // Neon Orange
  '#BF5AF2', // Purple
  '#64D2FF', // Cyan
  '#FF375F', // Crimson
  '#FFD60A', // Yellow
  '#8E8E93'  // Slate Gray
];

const ExecutiveSummary = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/executive')
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(e => {
        console.error(e);
        setLoading(false);
      });
  }, []);

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <Loader2 className="animate-spin text-primary" size={32} />
    </div>
  );

  if (!data || data.error) return <div className="text-red-500">Error loading data: {data?.error || 'Unknown'}</div>;

  const { kpis, trend, cat_monthly, channel_monthly, top_categories, top_brands } = data;

  // Format currency
  const formatMoney = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(val || 0);
  const formatNum = (val) => new Intl.NumberFormat('en-US').format(val || 0);

  // Group cat_monthly for unified stacked bar chart
  const catNames = [...new Set(cat_monthly.map(item => item.category))].slice(0, 10);
  const groupedCat = trend.map(t => {
    const obj = { month: t.month };
    cat_monthly.filter(c => c.month === t.month).forEach(c => {
      obj[c.category] = c.sales;
    });
    return obj;
  });

  const channelNames = [...new Set(channel_monthly.map(item => item.traffic_source))];
  const groupedChannel = trend.map(t => {
    const obj = { month: t.month };
    channel_monthly.filter(c => c.month === t.month).forEach(c => {
      obj[c.traffic_source] = c.sales;
    });
    return obj;
  });

  // The prompt asked for:
  // Tile 1: Total Sales
  // Tile 2: Total Orders
  // Tile 3: Unique Visitors (We map Net Profit to it visually for now or use the active_buyers if needed, wait we have active_buyers)
  // Let's assume unique_visitors is available, fallback to 0
  
  return (
    <div className="space-y-6 fade-in">
      <div className="grid grid-cols-4 gap-6">
        <div className="scorecard">
          <div className="scorecard-label">올해 총 매출 (Total Sales)</div>
          <div className="scorecard-value select-none">{formatMoney(kpis?.total_sales)}</div>
        </div>
        
        <div className="scorecard">
          <div className="scorecard-label">올해 총 주문 (Total Orders)</div>
          <div className="scorecard-value select-none">{formatNum(kpis?.total_orders)}</div>
        </div>

        <div className="scorecard">
          <div className="scorecard-label">올해 순 이익 (Net Profit)</div>
          <div className="scorecard-value select-none">{formatMoney(kpis?.net_profit)}</div>
        </div>

        <div className="scorecard">
          <div className="scorecard-label">올해 활성 구매자 (Active Buyers)</div>
          <div className="scorecard-value select-none">{formatNum(kpis?.active_buyers)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-card p-6 rounded-2xl shadow-lg border border-glass">
          <h3 className="text-xl font-bold mb-4">월별 카테고리별 매출 (Monthly Sales by Category)</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={groupedCat}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="month" stroke="#aaa" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#aaa" fontSize={12} tickFormatter={(val) => `$${(val / 1000).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} K`} tickLine={false} axisLine={false} />
                <Tooltip formatter={(val) => `$${(val / 1000).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} K`} contentStyle={{ backgroundColor: '#1a1a2e', borderColor: '#ffffff20', borderRadius: '8px' }} />
                <Legend iconType="circle" />
                {catNames.map((c, i) => (
                  <Bar key={c} dataKey={c} stackId="a" fill={PREMIUM_DARK_PALETTE[i % PREMIUM_DARK_PALETTE.length]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card p-6 rounded-2xl shadow-lg border border-glass">
          <h3 className="text-xl font-bold mb-4">월별 유입 채널별 매출 (Monthly Sales by Source)</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={groupedChannel}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="month" stroke="#aaa" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#aaa" fontSize={12} tickFormatter={(val) => `$${(val / 1000).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} K`} tickLine={false} axisLine={false} />
                <Tooltip formatter={(val) => `$${(val / 1000).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} K`} contentStyle={{ backgroundColor: '#1a1a2e', borderColor: '#ffffff20', borderRadius: '8px' }} />
                <Legend iconType="circle" />
                {channelNames.map((c, i) => (
                  <Bar key={c} dataKey={c} stackId="a" fill={PREMIUM_DARK_PALETTE[i % PREMIUM_DARK_PALETTE.length]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card p-6 rounded-2xl shadow-lg border border-glass">
          <h3 className="text-xl font-bold mb-4">매출 상위 카테고리 (Top 5 Categories)</h3>
          <table className="premium-table mt-4">
            <thead>
              <tr>
                <th style={{ width: '60px', textAlign: 'center' }}>RANK</th>
                <th>CATEGORY</th>
                <th style={{ textAlign: 'right' }}>SALES</th>
              </tr>
            </thead>
            <tbody>
              {top_categories?.map((c, i) => (
                <tr key={c.category}>
                  <td style={{ textAlign: 'center' }} className="font-bold text-muted">{i+1}</td>
                  <td className="text-white font-medium">{c.category}</td>
                  <td style={{ textAlign: 'right' }} className="font-bold text-white">{formatMoney(c.sales)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-card p-6 rounded-2xl shadow-lg border border-glass">
          <h3 className="text-xl font-bold mb-4">매출 상위 브랜드 (Top 5 Brands)</h3>
          <table className="premium-table mt-4">
            <thead>
              <tr>
                <th style={{ width: '60px', textAlign: 'center' }}>RANK</th>
                <th>BRAND</th>
                <th style={{ textAlign: 'right' }}>SALES</th>
              </tr>
            </thead>
            <tbody>
              {top_brands?.map((b, i) => (
                <tr key={b.brand}>
                  <td style={{ textAlign: 'center' }} className="font-bold text-muted">{i+1}</td>
                  <td className="text-white font-medium">{b.brand}</td>
                  <td style={{ textAlign: 'right' }} className="font-bold text-white">{formatMoney(b.sales)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ExecutiveSummary;
