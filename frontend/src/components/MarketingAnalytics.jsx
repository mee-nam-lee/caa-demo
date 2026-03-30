import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

const COLORS = [
  '#FF2D55', // Neon Pink/Red
  '#5E5CE6', // Indigo
  '#0A84FF', // Bright Blue
  '#FF9F0A', // Neon Orange
  '#32D74B'  // Neon Green
];

const MarketingAnalytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/marketing')
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

  if (!data || data.error) return <div className="text-red-500">Error loading data</div>;

  const { demographics, traffic_source } = data;

  // Process Demographics
  const genderData = demographics.reduce((acc, curr) => {
    const existing = acc.find(x => x.name === curr.gender);
    if (existing) existing.value += curr.users;
    else acc.push({ name: curr.gender, value: curr.users });
    return acc;
  }, []);

  // Process Age
  const ageData = demographics.reduce((acc, curr) => {
    const ageGroup = curr.age < 20 ? '<20' : curr.age < 30 ? '20-29' : curr.age < 40 ? '30-39' : curr.age < 50 ? '40-49' : '50+';
    const existing = acc.find(x => x.ageGroup === ageGroup);
    if (existing) existing.users += curr.users;
    else acc.push({ ageGroup, users: curr.users });
    return acc;
  }, []).sort((a,b) => a.ageGroup.localeCompare(b.ageGroup));

  // Traffic Source Table
  const formatMoney = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  return (
    <div className="space-y-6 fade-in">
      <h2 className="text-3xl font-bold mb-6 border-b border-glass pb-4">Customer & Marketing Analytics</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card p-6 rounded-2xl shadow-lg border border-glass">
          <h3 className="text-xl font-bold mb-4">성별 분포 (Gender Distribution)</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={genderData} innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" stroke="none">
                  {genderData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{ backgroundColor: '#1a1a2e', border: 'none', borderRadius: '8px' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card p-6 rounded-2xl shadow-lg border border-glass">
          <h3 className="text-xl font-bold mb-4">연령대 분포 (Age Distribution)</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#ffffff10" />
                <XAxis type="number" stroke="#888" tickLine={false} axisLine={false} />
                <YAxis dataKey="ageGroup" type="category" stroke="#888" tickLine={false} axisLine={false} width={80} />
                <RechartsTooltip cursor={{fill: '#ffffff10'}} contentStyle={{ backgroundColor: '#1a1a2e', border: 'none', borderRadius: '8px' }} />
                <Bar dataKey="users" fill="#0A84FF" radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-card p-6 rounded-2xl shadow-lg border border-glass">
        <h3 className="text-xl font-bold mb-4">유입 채널 분석 (Traffic Source Conversion)</h3>
          <table className="premium-table mt-4">
            <thead>
              <tr>
                <th>채널 (Source)</th>
                <th style={{ textAlign: 'right' }}>가입자 (Signups)</th>
                <th style={{ textAlign: 'right' }}>구매자 (Buyers)</th>
                <th style={{ textAlign: 'right' }}>전환율 (Conversion)</th>
                <th style={{ textAlign: 'right' }}>창출 매출 (Revenue)</th>
              </tr>
            </thead>
            <tbody>
              {traffic_source?.sort((a,b) => b.total_revenue - a.total_revenue).map((row, idx) => (
                <tr key={idx}>
                  <td className="text-white font-medium">{row.traffic_source}</td>
                  <td style={{ textAlign: 'right' }}>{row.signups.toLocaleString()}</td>
                  <td style={{ textAlign: 'right' }}>{row.buyers.toLocaleString()}</td>
                  <td style={{ textAlign: 'right' }} className="text-blue-400 font-bold">{(row.conversion_rate * 100).toFixed(1)}%</td>
                  <td style={{ textAlign: 'right' }} className="text-green-400 font-bold">{formatMoney(row.total_revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
      </div>
    </div>
  );
};

export default MarketingAnalytics;
