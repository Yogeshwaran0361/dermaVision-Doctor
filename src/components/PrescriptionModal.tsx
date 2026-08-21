import React, { useState } from 'react';
import { FileText, CheckCircle2, X, Pill, AlertCircle } from 'lucide-react';

interface PrescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitPrescription: (diagnosis: string, prescription: string) => Promise<void>;
  patientName: string;
  defaultDiagnosis: string;
}

export const PrescriptionModal: React.FC<PrescriptionModalProps> = ({
  isOpen,
  onClose,
  onSubmitPrescription,
  patientName,
  defaultDiagnosis
}) => {
  const [diagnosis, setDiagnosis] = useState(defaultDiagnosis);
  const [prescription, setPrescription] = useState(
    "1. Apply Mupirocin 2% Topical Ointment twice daily for 7 days.\n2. Apply Cetaphil Gentle Cleanser twice daily.\n3. Avoid direct UV sunlight. Wear broad-spectrum SPF 50+ sunscreen."
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!diagnosis.trim() || !prescription.trim()) {
      setError('Please provide both diagnosis and prescription details.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmitPrescription(diagnosis, prescription);
      onClose();
    } catch (err: any) {
      console.error('Prescription Issue Error:', err);
      setError(err.message || 'Failed to issue prescription.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full relative shadow-2xl flex flex-col gap-6">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 shrink-0">
            <Pill className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-black text-white">Issue Official Medical Prescription</h3>
            <p className="text-xs text-slate-400">Patient: <span className="text-slate-200 font-bold">{patientName}</span></p>
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-xs">
          
          <div className="flex flex-col gap-1">
            <label className="text-slate-300 font-semibold">Confirmed Clinical Diagnosis</label>
            <input
              type="text"
              required
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold focus:outline-none focus:border-emerald-500"
              placeholder="e.g. Atopic Eczema / Contact Dermatitis"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-slate-300 font-semibold">Rx Medication & Dosage Instructions</label>
            <textarea
              required
              rows={5}
              value={prescription}
              onChange={(e) => setPrescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono leading-relaxed focus:outline-none focus:border-emerald-500"
              placeholder="List prescribed medicines, frequency, and care instructions..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Processing...
                </span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Sign & Issue Prescription</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
