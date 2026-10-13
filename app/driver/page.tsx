'use client';


import { supabase } from '../../lib/supabase';
import { useState, useEffect } from 'react';
import { getRidesAction, updateRideStatusAction } from '../actions';
import Link from 'next/link';


export default function DriverDashboard() {
  const [rides, setRides] = useState<any[]>([]);

  const fetchRides = async () => {
    const res = await getRidesAction();
    if (res.success && res.data) {
      setRides(res.data);
    }
  };

 useEffect(() => {
    fetchRides();

    const channel = supabase
      .channel('realtime_rides_driver')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rides' },
        () => {
          fetchRides();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleStatusUpdate = async (rideId: string, newStatus: string) => {
    const res = await updateRideStatusAction(rideId, newStatus);
    if (res.success) {
      fetchRides();
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800">
      {/* Driver Header */}
      <header className="bg-yellow-500 text-black py-4 px-6 shadow-md flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold tracking-wide">Driver Dashboard 🚕</h1>
          <p className="text-xs text-yellow-900 font-medium">Accept and manage passenger requests</p>
        </div>
        <Link 
          href="/" 
          className="text-xs bg-black text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-gray-800 transition"
        >
          Switch to Rider View 👤
        </Link>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto p-4 md:p-6">
        <h2 className="text-lg font-semibold mb-4 text-black">Available & Active Requests</h2>

        {rides.length === 0 ? (
          <div className="bg-white p-6 rounded-xl text-center text-gray-500 border border-gray-200">
            No ride requests available right now.
          </div>
        ) : (
          <div className="space-y-4">
            {rides.map((ride) => (
              <div
                key={ride.id}
                className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between md:items-center gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-semibold uppercase ${
                        ride.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : ride.status === 'accepted'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {ride.status || 'pending'}
                    </span>
                    <span className="text-xs text-gray-400">ID: {ride.id.slice(0, 8)}...</span>
                  </div>
                  
                  <p className="font-semibold text-gray-900 text-base">📍 Pickup: {ride.pickup_location}</p>
                  <p className="text-gray-600 text-sm">🏁 Drop: {ride.drop_location}</p>
                  <p className="text-black font-bold text-base mt-2">Fare: ₹{ride.fare}</p>
                </div>

                {/* Driver Action Buttons */}
                <div className="flex gap-2">
                  {ride.status === 'pending' && (
                    <button
                      onClick={() => handleStatusUpdate(ride.id, 'accepted')}
                      className="w-full md:w-auto bg-blue-600 text-white font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm"
                    >
                      Accept Ride
                    </button>
                  )}

                  {ride.status === 'accepted' && (
                    <button
                      onClick={() => handleStatusUpdate(ride.id, 'completed')}
                      className="w-full md:w-auto bg-green-600 text-white font-medium px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm"
                    >
                      Complete Ride
                    </button>
                  )}

                  {ride.status === 'completed' && (
                    <span className="text-xs bg-gray-100 text-gray-500 px-3 py-2 rounded-lg font-medium">
                      Finished
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}