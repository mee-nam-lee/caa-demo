import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { FunnelChart, Funnel, LabelList, Tooltip, ResponsiveContainer } from 'recharts';

const PREMIUM_DARK_PALETTE = [
  '#FF2D55', '#5E5CE6', '#0A84FF', '#32D74B', '#FF9F0A', '#BF5AF2', '#64D2FF', '#FF375F', '#FFD60A', '#8E8E93'
];

const WebAnalytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/web-analytics')
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

  const { funnel, sessions } = data;

  // Order funnel properly
  const funnelOrder = ['home', 'product', 'cart', 'purchase'];
  const funnelData = funnelOrder.map((fType, index) => {
    const item = funnel.find(f => f.event_type === fType);
    return {
      name: fType.charAt(0).toUpperCase() + fType.slice(1),
      value: item ? item.sessions : 0,
      fill: PREMIUM_DARK_PALETTE[index]
    };
  }).filter(f => f.value > 0);

  // Group browser data
  const browserData = sessions.reduce((acc, curr) => {
    const existing = acc.find(x => x.browser === curr.browser);
    if (existing) {
      existing.sessions += curr.total_sessions;
      existing.purchases += curr.purchases;
    } else {
      acc.push({ browser: curr.browser, sessions: curr.total_sessions, purchases: curr.purchases });
    }
    return acc;
  }, []).sort((a,b) => b.sessions - a.sessions);

  return (
    <div className="space-y-6 fade-in">
      <h2 className="text-3xl font-bold mb-6 border-b border-glass pb-4">Web & Funnel Analytics</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card p-6 rounded-2xl shadow-lg border border-glass">
          <h3 className="text-xl font-bold mb-4">퍼널 이탈률 분석 (Funnel Drop-off)</h3>
          <p className="text-sm text-muted mb-4">Visit ➔ Product ➔ Cart ➔ Purchase</p>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <FunnelChart>
                <Tooltip contentStyle={{ backgroundColor: '#1a1a2e', border: 'none', borderRadius: '8px' }} />
                <Funnel dataKey="value" data={funnelData} isAnimationActive>
                  <LabelList position="right" fill="#fff" stroke="none" dataKey="name" />
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card p-6 rounded-2xl shadow-lg border border-glass">
          <h3 className="text-xl font-bold mb-4">세션 데이터 (Browsers)</h3>
          <table className="premium-table mt-4">
            <thead>
              <tr>
                <th>브라우저</th>
                <th style={{ textAlign: 'right' }}>총 세션</th>
                <th style={{ textAlign: 'right' }}>구매 연결</th>
                <th style={{ textAlign: 'right' }}>전환율</th>
              </tr>
            </thead>
            <tbody>
              {browserData.map((row, idx) => {
                const conv = row.sessions > 0 ? (row.purchases / row.sessions) * 100 : 0;
                return (
                  <tr key={idx}>
                    <td className="text-white font-medium">{row.browser}</td>
                    <td style={{ textAlign: 'right' }}>{row.sessions.toLocaleString()}</td>
                    <td style={{ textAlign: 'right' }}>{row.purchases.toLocaleString()}</td>
                    <td style={{ textAlign: 'right' }} className="text-blue-400 font-bold">{conv.toFixed(2)}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default WebAnalytics;
