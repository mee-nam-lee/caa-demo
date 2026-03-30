import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, ZAxis } from 'recharts';

const LogisticsOverview = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/logistics')
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

  const { lead_time, map } = data;

  const mapData = map?.map(m => ({
    name: m.name,
    x: m.longitude,
    y: m.latitude,
    z: m.outbound_volume,
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#1a1a2e] p-3 rounded-lg border border-white/20 shadow-xl">
          <p className="font-bold text-white">{data.name}</p>
          <p className="text-sm text-muted">Outbound: <span className="text-blue-400 font-bold">{data.z.toLocaleString()} items</span></p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 fade-in">
      <h2 className="text-3xl font-bold mb-6 border-b border-glass pb-4">Logistics & Supply Chain</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-glass p-6 rounded-2xl shadow-lg border border-glass">
          <h3 className="text-xl font-bold mb-4">배송 리드타임 (Delivery Lead Time - Days)</h3>
          <p className="text-sm text-muted mb-4">주문(Created) ➔ 출고(Shipped) ➔ 배달 완료(Delivered)</p>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lead_time}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="month" stroke="#aaa" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#aaa" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#1a1a2e', borderColor: '#ffffff20', borderRadius: '8px' }} />
                <Legend />
                <Line type="monotone" name="Days to Ship" dataKey="days_to_ship" stroke="#FF6B6B" strokeWidth={3} />
                <Line type="monotone" name="Days in Transit" dataKey="days_in_transit" stroke="#4ECDC4" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-glass p-6 rounded-2xl shadow-lg border border-glass">
          <h3 className="text-xl font-bold mb-4">물류 센터 출고맵 (Distribution Centers)</h3>
          <p className="text-sm text-muted mb-4">Map coordinates based on Longitude (X) / Latitude (Y)</p>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis type="number" dataKey="x" name="Longitude" stroke="#aaa" domain={['auto', 'auto']} />
                <YAxis type="number" dataKey="y" name="Latitude" stroke="#aaa" domain={['auto', 'auto']} />
                <ZAxis type="number" dataKey="z" range={[50, 400]} name="Volume" />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
                <Scatter name="Centers" data={mapData} fill="#8884d8" opacity={0.8} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogisticsOverview;
