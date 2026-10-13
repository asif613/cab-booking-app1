'use server';

import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || '';

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase URL or Anon Key missing in .env.local');
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

// 1. Ride Book Action
export async function bookRideAction(pickup: string, drop: string) {
  try {
    const supabase = getSupabaseClient();

    const baseFare = 100;
    const distanceFactor = Math.abs(pickup.length - drop.length) * 12;
    const randomVariation = Math.floor(Math.random() * 80) + 50;
    const calculatedFare = baseFare + distanceFactor + randomVariation;

    const { data, error } = await supabase
      .from('rides')
      .insert([
        {
          rider_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          driver_id: null,
          pickup_location: pickup,
          drop_location: drop,
          fare: calculatedFare,
          status: 'pending',
        },
      ])
      .select();

    if (error) {
      console.error('Supabase Database Error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error('Server Action Catch Error:', err);
    return { success: false, error: err?.message || 'Network connection failed' };
  }
}

// 2. Fetch Rides Action
export async function getRidesAction() {
  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('rides')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Fetch Rides Error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error('Catch Error:', err);
    return { success: false, error: err?.message || 'Failed to fetch rides' };
  }
}

// 3. Update Ride Status Action
export async function updateRideStatusAction(rideId: string, newStatus: string) {
  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('rides')
      .update({ status: newStatus })
      .eq('id', rideId)
      .select();

    if (error) {
      console.error('Update Status Error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error('Catch Error:', err);
    return { success: false, error: err?.message || 'Failed to update status' };
  }
}