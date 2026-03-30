import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

const SalesPerformance = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/sales')
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

  const { performance, returns, slow_inventory } = data;
  const formatMoney = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  return (
    <div className="space-y-6 fade-in">
      <h2 className="text-3xl font-bold mb-6 border-b border-glass pb-4">Sales & Product Performance</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card p-6 rounded-2xl shadow-lg border border-glass h-full">
          <h3 className="text-xl font-bold mb-4">브랜드 성과 (Top Brand Performance)</h3>
          <table className="premium-table mt-4">
            <thead>
              <tr>
                <th>Brand / Category</th>
                <th style={{ textAlign: 'right' }}>Sales</th>
                <th style={{ textAlign: 'right' }}>Volume</th>
                <th style={{ textAlign: 'right' }}>Margin</th>
              </tr>
            </thead>
            <tbody>
              {performance && [...performance].sort((a, b) => b.margin - a.margin).slice(0, 10).map((row, idx) => (
                <tr key={idx}>
                  <td>
                    <div className="font-semibold text-white">{row.brand}</div>
                    <div className="text-xs text-muted">{row.category}</div>
                  </td>
                  <td style={{ textAlign: 'right' }} className="text-green-400 font-bold">{formatMoney(row.sales)}</td>
                  <td style={{ textAlign: 'right' }}>{row.volume.toLocaleString()}</td>
                  <td style={{ textAlign: 'right' }} className="text-blue-400">{(row.margin * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-6">
          <div className="bg-card p-6 rounded-2xl shadow-lg border border-glass">
            <h3 className="text-xl font-bold mb-4 text-red-400">비정상 반품 상품 (High Returns)</h3>
            <table className="premium-table mt-4">
              <thead>
                <tr>
                  <th>Brand</th>
                  <th>Category</th>
                  <th style={{ textAlign: 'right' }}>Returned Volume</th>
                </tr>
              </thead>
              <tbody>
                {returns?.slice(0, 5).map((row, idx) => (
                  <tr key={idx}>
                    <td className="font-semibold text-white">{row.brand}</td>
                    <td className="text-muted">{row.category}</td>
                    <td style={{ textAlign: 'right' }} className="text-red-400 font-bold">{row.returned_volume}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-card p-6 rounded-2xl shadow-lg border border-glass">
            <h3 className="text-xl font-bold mb-4 text-orange-400">악성 재고 (Slow-moving Inventory)</h3>
            <p className="text-xs text-muted mb-3">Longest days in stock without being sold</p>
            <table className="premium-table mt-4">
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th style={{ textAlign: 'right' }}>Cost</th>
                  <th style={{ textAlign: 'right' }} className="text-orange-400">Days Unsold</th>
                </tr>
              </thead>
              <tbody>
                {slow_inventory?.slice(0, 5).map((row, idx) => (
                  <tr key={idx}>
                    <td>
                      <div className="font-semibold truncate max-w-[200px]" title={row.name}>{row.name}</div>
                      <div className="text-xs text-muted">{row.brand}</div>
                    </td>
                    <td style={{ textAlign: 'right' }}>{formatMoney(row.cost)}</td>
                    <td style={{ textAlign: 'right' }} className="text-orange-400 font-bold">{row.days_in_stock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesPerformance;
