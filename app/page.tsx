'use client';


import { useUser, SignInButton, UserButton } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { bookRideAction, getRidesAction } from './actions';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { supabase } from '../lib/supabase';

const MapView = dynamic(() => import('./components/Map'), { 
  ssr: false,
  loading: () => <div className="h-[350px] bg-gray-200 rounded-xl animate-pulse flex items-center justify-center text-gray-500">Loading Map...</div>
});

export default function Home() {
  const { isSignedIn, user } = useUser();
  const [pickup, setPickup] = useState('');
  const [drop, setDrop] = useState('');
  const [bookingStatus, setBookingStatus] = useState('');
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRide, setSelectedRide] = useState<any | null>(null);

  const fetchRides = async () => {
    const res = await getRidesAction();
    if (res.success && res.data) {
      setRides(res.data);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchRides();

    // Supabase Realtime Channel Subscription
    const channel = supabase
      .channel('realtime_rides_rider')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rides' },
        () => {
          fetchRides(); // Bina refresh instantaneous sync!
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  const handleBookRide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickup || !drop) {
      setBookingStatus('Please enter both pickup and drop locations.');
      return;
    }

    setLoading(true);
    setBookingStatus('Finding nearby drivers...');

    const result = await bookRideAction(pickup, drop);

    setLoading(false);
    if (!result.success) {
      setBookingStatus('Booking failed. Please try again.');
      return;
    }

    setBookingStatus('Cab requested successfully! 🚗');
    setPickup('');
    setDrop('');
    fetchRides();
  };

  const getFareBreakdown = (totalFare: number) => {
    const baseFare = 100;
    const remaining = Math.max(0, totalFare - baseFare);
    const distanceCharge = Math.round(remaining * 0.7);
    const surgeFee = Math.max(0, totalFare - baseFare - distanceCharge);
    return { baseFare, distanceCharge, surgeFee, totalFare };
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800">
      {/* Header */}
      <header className="bg-black text-white py-4 px-6 shadow-md flex justify-between items-center">
        <h1 className="text-xl font-bold tracking-wide">UberClone</h1>
        
        <div className="flex items-center gap-4">
          <Link 
            href="/driver" 
            className="text-xs bg-white text-black px-3 py-1.5 rounded-lg font-semibold hover:bg-gray-200 transition"
          >
            Switch to Driver View 🚕
          </Link>

          {isSignedIn ? (
            <UserButton />
          ) : (
            <SignInButton mode="modal">
              <button className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-blue-700 transition">
                Sign In
              </button>
            </SignInButton>
          )}
        </div>
      </header>
      

      {/* Main Container */}
      <main className="max-w-4xl mx-auto p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Left Column: Booking Form + Live Map */}
        <div className="space-y-6">
          {/* Booking Card */}
          <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold mb-4 text-black">Book a Ride</h2>
            
            <form onSubmit={handleBookRide} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">PICKUP LOCATION</label>
                <input
                  type="text"
                  placeholder="e.g. Connaught Place"
                  value={pickup}
                  onChange={(e) => setPickup(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">DROP LOCATION</label>
                <input
                  type="text"
                  placeholder="e.g. Noida Sector 62"
                  value={drop}
                  onChange={(e) => setDrop(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-black text-white font-medium py-3 rounded-lg hover:bg-gray-800 transition disabled:bg-gray-400"
              >
                {loading ? 'Searching...' : 'Request Ride'}
              </button>
            </form>

            {bookingStatus && (
              <p className="mt-4 text-sm font-medium text-center text-blue-600 bg-blue-50 p-2 rounded-lg">
                {bookingStatus}
              </p>
            )}
          </section>

          {/* Interactive Map Section */}
          <section className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-sm font-semibold mb-3 text-gray-700">Live Map Area 🗺️</h3>
            <MapView />
          </section>
        </div>

        {/* Right Column: History Card */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-fit">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-black">Recent Activity 📜</h2>
            <span className="text-xs text-gray-400">Click ride for details</span>
          </div>

          {rides.length === 0 ? (
            <p className="text-gray-500 text-sm">No rides found.</p>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {rides.map((ride) => (
                <div
                  key={ride.id}
                  onClick={() => setSelectedRide(ride)}
                  className="p-4 border border-gray-100 bg-gray-50 rounded-lg hover:border-gray-300 hover:shadow-sm cursor-pointer transition"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">📍 {ride.pickup_location}</p>
                      <p className="text-gray-600 text-xs mt-0.5">🏁 {ride.drop_location}</p>
                    </div>
                    <span className="font-bold text-gray-900 text-sm">₹{ride.fare}</span>
                  </div>

                  <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-200">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-semibold uppercase ${
                        ride.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : ride.status === 'accepted'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {ride.status || 'pending'}
                    </span>
                    <span className="text-xs text-gray-400 hover:underline">View Breakdown &rarr;</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </main>

      {/* Ride Details & Fare Breakdown Modal with Fixed High z-index */}
      {selectedRide && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-lg text-gray-900">Ride Details & Fare</h3>
              <button 
                onClick={() => setSelectedRide(null)}
                className="text-gray-400 hover:text-black font-bold text-xl px-2"
              >
                ✕
              </button>
            </div>

            {/* Route Summary */}
            <div className="bg-gray-50 p-3 rounded-lg space-y-1">
              <p className="text-xs text-gray-500 uppercase font-medium">Route Information</p>
              <p className="text-sm font-semibold text-gray-800">📍 Pickup: {selectedRide.pickup_location}</p>
              <p className="text-sm font-semibold text-gray-800">🏁 Drop: {selectedRide.drop_location}</p>
            </div>

            {/* Status & Time */}
            <div className="flex justify-between items-center text-xs text-gray-600 bg-blue-50 p-3 rounded-lg">
              <div>
                <span className="font-semibold block text-gray-500">Status</span>
                <span className="uppercase font-bold text-blue-700">{selectedRide.status || 'pending'}</span>
              </div>
              <div className="text-right">
                <span className="font-semibold block text-gray-500">Booked At</span>
                <span>{new Date(selectedRide.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>

            {/* Fare Breakdown */}
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-semibold text-gray-500 uppercase">Fare Breakdown</h4>
              
              {(() => {
                const breakdown = getFareBreakdown(selectedRide.fare);
                return (
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between text-gray-600">
                      <span>Base Fare</span>
                      <span>₹{breakdown.baseFare}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Distance Charge</span>
                      <span>₹{breakdown.distanceCharge}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Surge / Fee</span>
                      <span>₹{breakdown.surgeFee}</span>
                    </div>
                    <div className="flex justify-between font-bold text-base border-t pt-2 text-black">
                      <span>Total Amount Paid</span>
                      <span>₹{breakdown.totalFare}</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            <button
              onClick={() => setSelectedRide(null)}
              className="w-full bg-black text-white font-medium py-2.5 rounded-lg hover:bg-gray-800 transition mt-4"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}