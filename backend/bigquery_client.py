import os
from dotenv import load_dotenv
load_dotenv()
os.environ["GOOGLE_API_USE_MTLS_ENDPOINT"] = "never"
from google.cloud import bigquery

class BQClient:
    def __init__(self):
        self.project_id = os.getenv("BILLING_PROJECT", "mn-org-box-01")
        self.client = bigquery.Client(project=self.project_id)
        self.dataset_id = os.getenv("DATASET_ID", "thelook_ecommerce")
        self.dataset_prefix = f"{self.project_id}.{self.dataset_id}"
        self._cache = {}
        # Run a dummy query to absorb the unavoidable OpenSSL mTLS missing module error on setup
        try:
            list(self.client.query("SELECT 1").result())
        except Exception:
            pass

    def _run_query(self, query):
        if query in self._cache:
            return self._cache[query]

        job = self.client.query(query)
        rows = list(job.result())
        result = [dict(r) for r in rows]
        self._cache[query] = result
        return result
        
    def get_executive_summary(self):
        # 1. KPIs
        kpi_query = f"""
        SELECT 
            SUM(oi.sale_price) as total_sales,
            COUNT(DISTINCT oi.order_id) as total_orders,
            COUNT(DISTINCT oi.user_id) as active_buyers,
            SUM(oi.sale_price - ii.cost) as net_profit
        FROM `{self.dataset_prefix}.order_items` oi
        JOIN `{self.dataset_prefix}.inventory_items` ii ON oi.inventory_item_id = ii.id
        WHERE EXTRACT(YEAR FROM oi.created_at) = 2026 AND oi.status NOT IN ('Cancelled', 'Returned')
        """
        
        # 2. Time-series trend (Monthly Sales and Orders)
        trend_query = f"""
        SELECT 
            FORMAT_DATE('%Y-%m', created_at) as month,
            SUM(sale_price) as sales,
            COUNT(DISTINCT order_id) as orders
        FROM `{self.dataset_prefix}.order_items`
        WHERE created_at >= CAST(DATE_TRUNC(DATE_SUB(CURRENT_DATE(), INTERVAL 11 MONTH), MONTH) AS TIMESTAMP)
          AND status NOT IN ('Cancelled', 'Returned')
        GROUP BY 1
        ORDER BY 1
        """
        
        # 3. Monthly Sales by Category
        cat_monthly_query = f"""
        SELECT 
            FORMAT_DATE('%Y-%m', oi.created_at) as month,
            p.category,
            SUM(oi.sale_price) as sales
        FROM `{self.dataset_prefix}.order_items` oi
        JOIN `{self.dataset_prefix}.products` p ON oi.product_id = p.id
        WHERE oi.created_at >= CAST(DATE_TRUNC(DATE_SUB(CURRENT_DATE(), INTERVAL 11 MONTH), MONTH) AS TIMESTAMP)
          AND oi.status NOT IN ('Cancelled', 'Returned')
        GROUP BY 1, 2
        """
        
        # 4. Monthly Sales by Traffic Channel
        channel_monthly_query = f"""
        SELECT 
            FORMAT_DATE('%Y-%m', oi.created_at) as month,
            u.traffic_source,
            SUM(oi.sale_price) as sales
        FROM `{self.dataset_prefix}.order_items` oi
        JOIN `{self.dataset_prefix}.users` u ON oi.user_id = u.id
        WHERE oi.created_at >= CAST(DATE_TRUNC(DATE_SUB(CURRENT_DATE(), INTERVAL 11 MONTH), MONTH) AS TIMESTAMP)
          AND oi.status NOT IN ('Cancelled', 'Returned')
        GROUP BY 1, 2
        """
        
        # 5. Top 5 Categories & Brands
        top_cats = f"""
        SELECT p.category, SUM(oi.sale_price) as sales 
        FROM `{self.dataset_prefix}.order_items` oi JOIN `{self.dataset_prefix}.products` p ON oi.product_id = p.id 
        WHERE EXTRACT(YEAR FROM oi.created_at) = 2026 AND oi.status NOT IN ('Cancelled', 'Returned') 
        GROUP BY 1 ORDER BY 2 DESC LIMIT 5
        """
        top_brands = f"""
        SELECT p.brand, SUM(oi.sale_price) as sales 
        FROM `{self.dataset_prefix}.order_items` oi JOIN `{self.dataset_prefix}.products` p ON oi.product_id = p.id 
        WHERE EXTRACT(YEAR FROM oi.created_at) = 2026 AND oi.status NOT IN ('Cancelled', 'Returned') 
        GROUP BY 1 ORDER BY 2 DESC LIMIT 5
        """

        try:
            return {
                "kpis": self._run_query(kpi_query)[0] if self._run_query(kpi_query) else {},
                "trend": self._run_query(trend_query),
                "cat_monthly": self._run_query(cat_monthly_query),
                "channel_monthly": self._run_query(channel_monthly_query),
                "top_categories": self._run_query(top_cats),
                "top_brands": self._run_query(top_brands)
            }
        except Exception as e:
            import traceback
            traceback.print_exc()
            return {"error": str(e)}

    def get_marketing_analytics(self):
        demo_query = f"""
        SELECT age, gender, country, city, count(1) as users
        FROM `{self.dataset_prefix}.users`
        GROUP BY 1, 2, 3, 4
        """
        
        traffic_query = f"""
        WITH UserSource AS (
            SELECT id as user_id, traffic_source 
            FROM `{self.dataset_prefix}.users`
        ),
        Purchases AS (
            SELECT user_id, SUM(sale_price) as revenue, COUNT(DISTINCT order_id) as orders
            FROM `{self.dataset_prefix}.order_items`
            WHERE status NOT IN ('Cancelled', 'Returned')
            GROUP BY 1
        )
        SELECT 
            u.traffic_source,
            COUNT(u.user_id) as signups,
            COUNT(p.user_id) as buyers,
            COUNT(p.user_id) / COUNT(u.user_id) as conversion_rate,
            COALESCE(SUM(p.revenue), 0) as total_revenue
        FROM UserSource u
        LEFT JOIN Purchases p ON u.user_id = p.user_id
        GROUP BY 1
        """

        try:
            return {
                "demographics": self._run_query(demo_query),
                "traffic_source": self._run_query(traffic_query)
            }
        except Exception as e:
            return {"error": str(e)}

    def get_web_analytics(self):
        funnel_query = f"""
        SELECT event_type, count(distinct session_id) as sessions
        FROM `{self.dataset_prefix}.events`
        WHERE event_type IN ('home', 'product', 'cart', 'purchase')
        GROUP BY 1
        """
        
        session_query = f"""
        SELECT browser, traffic_source, COUNT(DISTINCT session_id) as total_sessions,
               COUNT(DISTINCT CASE WHEN event_type = 'purchase' THEN session_id END) as purchases
        FROM `{self.dataset_prefix}.events`
        GROUP BY 1, 2
        """

        try:
            return {
                "funnel": self._run_query(funnel_query),
                "sessions": self._run_query(session_query)
            }
        except Exception as e:
            return {"error": str(e)}

    def get_sales_performance(self):
        perf_query = f"""
        SELECT p.category, p.brand, 
               SUM(oi.sale_price) as sales, 
               COUNT(oi.id) as volume, 
               SUM(oi.sale_price - ii.cost)/SUM(oi.sale_price) as margin
        FROM `{self.dataset_prefix}.order_items` oi
        JOIN `{self.dataset_prefix}.products` p ON oi.product_id = p.id
        JOIN `{self.dataset_prefix}.inventory_items` ii ON oi.inventory_item_id = ii.id
        WHERE oi.status NOT IN ('Cancelled', 'Returned')
        GROUP BY 1, 2
        ORDER BY 3 DESC LIMIT 50
        """
        
        returns_query = f"""
        SELECT p.category, p.brand, COUNT(oi.id) as returned_volume
        FROM `{self.dataset_prefix}.order_items` oi
        JOIN `{self.dataset_prefix}.products` p ON oi.product_id = p.id
        WHERE oi.status = 'Returned'
        GROUP BY 1, 2
        ORDER BY 3 DESC LIMIT 20
        """
        
        slow_inventory_query = f"""
        SELECT p.category, p.name, p.brand, ii.cost, DATE_DIFF(CURRENT_DATE(), DATE(ii.created_at), DAY) as days_in_stock
        FROM `{self.dataset_prefix}.inventory_items` ii
        JOIN `{self.dataset_prefix}.products` p ON ii.product_id = p.id
        WHERE ii.sold_at IS NULL
        ORDER BY days_in_stock DESC
        LIMIT 100
        """

        try:
            return {
                "performance": self._run_query(perf_query),
                "returns": self._run_query(returns_query),
                "slow_inventory": self._run_query(slow_inventory_query)
            }
        except Exception as e:
            return {"error": str(e)}

    def get_logistics_status(self):
        lead_time_query = f"""
        SELECT 
            FORMAT_DATE('%Y-%m', created_at) as month,
            AVG(TIMESTAMP_DIFF(shipped_at, created_at, HOUR)/24.0) as days_to_ship,
            AVG(TIMESTAMP_DIFF(delivered_at, shipped_at, HOUR)/24.0) as days_in_transit
        FROM `{self.dataset_prefix}.orders`
        WHERE status = 'Complete' AND EXTRACT(YEAR FROM created_at) = 2026
        GROUP BY 1 ORDER BY 1
        """
        
        map_query = f"""
        SELECT CAST(d.id AS STRING) as id, d.name, d.latitude, d.longitude, count(o.id) as outbound_volume
        FROM `{self.dataset_prefix}.distribution_centers` d
        LEFT JOIN `{self.dataset_prefix}.inventory_items` i ON i.product_distribution_center_id = d.id
        LEFT JOIN `{self.dataset_prefix}.order_items` o ON o.inventory_item_id = i.id
        WHERE o.status NOT IN ('Cancelled', 'Returned')
        GROUP BY 1, 2, 3, 4
        """

        try:
            return {
                "lead_time": self._run_query(lead_time_query),
                "map": self._run_query(map_query)
            }
        except Exception as e:
            return {"error": str(e)}

    def clear_cache(self):
        self._cache = {}

bq_client = BQClient()
