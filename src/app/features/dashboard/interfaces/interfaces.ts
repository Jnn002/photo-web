export interface DashbordAPIResponse {
    active_sessions_count: number;
    sessions_this_month: number;
    total_revenue_this_month: string;
    pending_balance: string;
    sessions_by_status: SessionsByStatus[];
}

export interface SessionsByStatus {
    status: string;
    count: number;
}

/*

{
  "active_sessions_count": 6,
  "sessions_this_month": 14,
  "total_revenue_this_month": "8400.00",
  "pending_balance": "1350.00",
  "sessions_by_status": [
    {
      "status": "Canceled",
      "count": 2
    },
    {
      "status": "Attended",
      "count": 2
    },
    {
      "status": "Request",
      "count": 2
    },
    {
      "status": "Negotiation",
      "count": 1
    },
    {
      "status": "Assigned",
      "count": 1
    },
    {
      "status": "Completed",
      "count": 6
    }
  ]
}

*/
