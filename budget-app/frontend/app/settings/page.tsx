"use client";

import { useEffect, useState } from "react";
import { fetchSettings, updateSettings, FringeSettings } from "@/lib/api";
import Link from "next/link";

export default function SettingsPage() {
  const [settings, setSettings] = useState<FringeSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetchSettings()
      .then((data) => {
        setSettings(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!settings) return;
    const { name, value } = e.target;
    setSettings({ ...settings, [name]: parseFloat(value) });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    try {
      await updateSettings(settings);
      setMsg("Settings saved successfully!");
      setTimeout(() => setMsg(""), 3000);
    } catch (err) {
      console.error(err);
      setMsg("Error saving settings.");
    }
  };

  if (loading) return <div className="p-4">Loading settings...</div>;
  if (!settings) return <div className="p-4 text-red-500">Error loading settings.</div>;

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Settings</h2>

      <div className="mb-8 p-4 bg-indigo-50 rounded-lg border border-indigo-100">
        <h3 className="text-lg font-semibold text-indigo-900 mb-2">Production Calendar</h3>
        <p className="text-sm text-indigo-700 mb-4">Configure production phases, shooting days, and automated holiday detection.</p>
        <Link
          href="/settings/calendar"
          className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded font-medium hover:bg-indigo-700 transition-colors"
        >
          Manage Calendar
        </Link>
      </div>

      <div className="border-t border-gray-100 my-8"></div>

      <h3 className="text-xl font-bold mb-4 text-gray-800">Fringe Settings</h3>

      {msg && (
        <div className={`mb-4 p-2 rounded ${msg.includes("Error") ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
          {msg}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Superannuation (%)</label>
          <input
            type="number"
            step="0.01"
            name="superannuation"
            value={settings.superannuation}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Holiday Pay (%)</label>
          <input
            type="number"
            step="0.01"
            name="holiday_pay"
            value={settings.holiday_pay}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Payroll Tax (%)</label>
          <input
            type="number"
            step="0.01"
            name="payroll_tax"
            value={settings.payroll_tax}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Workers Comp (%)</label>
          <input
            type="number"
            step="0.01"
            name="workers_comp"
            value={settings.workers_comp}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Contingency (% of BTL)</label>
          <input
            type="number"
            step="0.01"
            name="contingency"
            value={settings.contingency}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
          />
        </div>

        <button
          type="submit"
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Save Settings
        </button>
      </form>
    </div>
  );
}
