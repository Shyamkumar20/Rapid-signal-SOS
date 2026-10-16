import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { emergencyStore } from "@/lib/emergency-store";
import { type Reward } from "@/lib/types";
import { Award, Trophy, Medal, Star, Gift, CheckCircle2, Clock } from "lucide-react";

export function RewardsPage() {
  const { profile } = useAuth();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRewards = useCallback(async () => {
    const allRewards = await emergencyStore.getAllRewards(profile?.id);
    setRewards(allRewards);
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    fetchRewards();
    const unsub = emergencyStore.subscribe(() => {
      fetchRewards();
    });
    return () => {
      unsub();
    };
  }, [fetchRewards]);

  const totalAwarded = rewards.filter((r) => r.status === "awarded").reduce((sum, r) => sum + r.amount, 0);
  const totalPending = rewards.filter((r) => r.status === "pending").reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="min-h-screen bg-gov-cream">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gov-navy-dark flex items-center gap-2">
            <Award className="text-gov-navy" /> Citizen Recognition
          </h2>
          <p className="text-sm text-gov-gray mt-1">
            The Government of India recognizes and rewards citizens who help in emergency response
          </p>
        </div>

        {/* Award summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-gov-navy to-gov-navy-dark rounded-lg p-5 text-white shadow-lg">
            <Trophy className="mb-2" size={28} />
            <p className="text-3xl font-bold">₹{totalAwarded.toLocaleString()}</p>
            <p className="text-sm text-white/80">Total Awarded</p>
          </div>
          <div className="bg-white rounded-lg p-5 shadow-sm border border-gov-cream-dark">
            <Clock className="mb-2 text-gov-warning" size={28} />
            <p className="text-3xl font-bold text-gov-navy-dark">₹{totalPending.toLocaleString()}</p>
            <p className="text-sm text-gov-gray">Pending Recognition</p>
          </div>
          <div className="bg-white rounded-lg p-5 shadow-sm border border-gov-cream-dark">
            <Star className="mb-2 text-gov-saffron" size={28} />
            <p className="text-3xl font-bold text-gov-navy-dark">{rewards.length}</p>
            <p className="text-sm text-gov-gray">Total Contributions</p>
          </div>
        </div>

        {/* Government recognition banner */}
        <div className="bg-gradient-to-r from-gov-saffron/10 via-white to-gov-green/10 rounded-lg p-6 mb-6 border border-gov-cream-dark">
          <div className="flex items-start gap-4">
            <Medal className="text-gov-saffron flex-shrink-0" size={40} />
            <div>
              <h3 className="font-bold text-gov-navy-dark">Good Samaritan Recognition Program</h3>
              <p className="text-sm text-gov-gray-dark mt-1 leading-relaxed">
                The Government of India values citizens who step forward during emergencies. Each verified
                SOS report you file through TARA makes you eligible for recognition under the
                Good Samaritan scheme. Outstanding contributors may receive additional honors and
                certificates from the National Emergency Response Division.
              </p>
            </div>
          </div>
        </div>

        {/* Rewards list */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 rounded-md shimmer-bg animate-shimmer" />
            ))}
          </div>
        ) : rewards.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Gift size={48} className="mx-auto mb-3 text-gov-gray/40" />
            <p className="text-gov-gray font-medium">No recognitions yet</p>
            <p className="text-xs text-gov-gray mt-1">
              File SOS reports through TARA to become eligible for government recognition
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {rewards.map((reward) => (
              <div
                key={reward.id}
                className={`bg-white rounded-lg shadow-sm border-l-4 p-4 transition-all hover:shadow-md ${
                  reward.status === "awarded" ? "border-l-gov-green" : "border-l-gov-saffron"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                      reward.status === "awarded" ? "bg-gov-success-light" : "bg-gov-saffron/10"
                    }`}>
                      {reward.status === "awarded" ? (
                        <Trophy className="text-gov-green" size={22} />
                      ) : (
                        <Medal className="text-gov-saffron" size={22} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gov-navy-dark">{reward.title}</h4>
                      <p className="text-sm text-gov-gray-dark mt-0.5">{reward.description}</p>
                      <div className="mt-2 flex items-center gap-3 text-xs text-gov-gray">
                        <span className="flex items-center gap-1"><Clock size={11} /> {new Date(reward.created_at).toLocaleDateString()}</span>
                        {reward.awarded_at && (
                          <span className="flex items-center gap-1 text-gov-green">
                            <CheckCircle2 size={11} /> Awarded on {new Date(reward.awarded_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xl font-bold text-gov-navy-dark">₹{reward.amount.toLocaleString()}</p>
                    <span className={`text-xs font-medium ${
                      reward.status === "awarded" ? "text-gov-green" : "text-gov-saffron"
                    }`}>
                      {reward.status === "awarded" ? "AWARDED" : "PENDING"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
