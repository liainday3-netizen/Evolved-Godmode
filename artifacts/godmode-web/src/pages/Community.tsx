import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import Colors, { type GodMode } from "@/lib/colors";
import { getUserId } from "@/lib/user";
import { SacredGeometry } from "@/components/SacredGeometry";

interface Post {
  id: string;
  userId: string;
  mode: GodMode;
  prompt: string;
  response: string;
  upvote_count: number;
  created_at: string;
}

const MODE_ICONS: Record<string, string> = {
  genius: "⚡",
  coder: "</>",
  strategist: "◈",
  oracle: "◉",
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function Community() {
  const [, navigate] = useLocation();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [upvoted, setUpvoted] = useState<Set<string>>(new Set());
  const userId = getUserId();

  const fetchPosts = useCallback(() => {
    fetch("/api/community?limit=30")
      .then((r) => r.json())
      .then((d) => { setPosts(d.data ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const handleUpvote = async (postId: string) => {
    const wasUpvoted = upvoted.has(postId);
    setUpvoted((prev) => {
      const next = new Set(prev);
      if (wasUpvoted) next.delete(postId);
      else next.add(postId);
      return next;
    });
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, upvote_count: p.upvote_count + (wasUpvoted ? -1 : 1) } : p
      )
    );
    await fetch(`/api/community/${postId}/upvote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
  };

  const handleDelete = async (postId: string) => {
    if (!window.confirm("Remove this post from the community?")) return;
    await fetch(`/api/community/${postId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: Colors.bg, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", opacity: 0.1, pointerEvents: "none", zIndex: 0 }}>
        <SacredGeometry size={500} accentColor="#C084FC" goldColor={Colors.accentGold} opacity={1} />
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 680, margin: "0 auto", padding: "0 16px 60px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px 0 0" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <button onClick={() => navigate("/")} style={{ background: "none", border: "none", color: Colors.textSecondary, cursor: "pointer", fontSize: 20, padding: "6px 10px", fontFamily: "inherit" }}>←</button>
            <div style={{ marginLeft: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#C084FC", letterSpacing: 3, textTransform: "uppercase" }}>Community</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: Colors.text, letterSpacing: -0.5 }}>Hub</div>
            </div>
          </div>
          <button
            onClick={fetchPosts}
            style={{ background: "none", border: `1px solid ${Colors.border}`, color: Colors.textSecondary, cursor: "pointer", fontSize: 12, padding: "8px 14px", borderRadius: 20, fontFamily: "inherit" }}
          >
            Refresh
          </button>
        </div>

        <div style={{ marginTop: 6, padding: "0 10px 20px", fontSize: 13, color: Colors.textMuted }}>
          The best GODMODE outputs, shared by the community.
        </div>

        {/* Feed */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: Colors.textMuted, fontSize: 14 }}>Loading...</div>
        ) : posts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{ fontSize: 48, opacity: 0.3, marginBottom: 16 }}>◉</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: Colors.textSecondary, marginBottom: 8 }}>No posts yet</div>
            <div style={{ fontSize: 13, color: Colors.textMuted }}>Be the first to share a conversation</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {posts.map((post) => {
              const mc = Colors.modes[post.mode] ?? Colors.modes.genius;
              const isOwn = post.userId === userId;
              const hasUpvoted = upvoted.has(post.id);

              return (
                <div key={post.id} style={{ backgroundColor: Colors.bgCard, border: `1px solid ${Colors.border}`, borderRadius: 16, padding: 20, transition: "border-color 0.15s" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = Colors.borderBright; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = Colors.border; }}
                >
                  {/* Post header */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, backgroundColor: mc.bg, border: `1px solid ${mc.color}33`, fontSize: 11, fontWeight: 700, color: mc.color, letterSpacing: 1, textTransform: "uppercase" }}>
                        <span>{MODE_ICONS[post.mode] ?? "⚡"}</span> {post.mode}
                      </span>
                      <span style={{ fontSize: 11, color: Colors.textMuted }}>{timeAgo(post.created_at)}</span>
                    </div>
                    {isOwn && (
                      <button onClick={() => handleDelete(post.id)} style={{ background: "none", border: "none", color: Colors.textMuted, cursor: "pointer", fontSize: 16, padding: "2px 6px", transition: "color 0.15s" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = Colors.error; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = Colors.textMuted; }}
                        title="Delete post">×</button>
                    )}
                  </div>

                  {/* Prompt */}
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: Colors.textMuted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 5 }}>Prompt</div>
                    <div style={{ fontSize: 14, color: Colors.text, lineHeight: 1.55, fontStyle: "italic" }}>"{post.prompt}"</div>
                  </div>

                  {/* Response */}
                  <div style={{ backgroundColor: Colors.bgElevated, borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: mc.color, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>GODMODE</div>
                    <div style={{ fontSize: 13, color: Colors.textSecondary, lineHeight: 1.6, whiteSpace: "pre-wrap", overflow: "hidden", maxHeight: 160, textOverflow: "ellipsis" }}>
                      {post.response}
                    </div>
                  </div>

                  {/* Upvote */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button
                      onClick={() => handleUpvote(post.id)}
                      style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 20, border: `1px solid ${hasUpvoted ? mc.color : Colors.border}`, backgroundColor: hasUpvoted ? mc.bg : "transparent", color: hasUpvoted ? mc.color : Colors.textMuted, cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit", transition: "all 0.15s" }}
                    >
                      <span style={{ fontSize: 14 }}>{hasUpvoted ? "▲" : "△"}</span>
                      <span>{post.upvote_count}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
