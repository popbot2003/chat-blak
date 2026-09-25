// ============================================
// src/components/admin/ChatsTab.jsx — Responsive
// عرض محادثات المستخدمين كـ مجلدات (Folders)
// متوافق مع:
//   - src/config/breakpoints.js
//   - src/hooks/useMediaQuery.js
//   - src/App.css (media queries موحّدة)
// ============================================

import { useState, useMemo, useCallback } from "react";
import UserFolderCard from "./UserFolderCard";

export default function ChatsTab({
  allChats,
  users,
  theme,
  darkMode,
  inputStyle,
  getUserById,
  onRefresh,
  onOpenUserChats,   // ✅ جديد: يفتح مودال محادثات المستخدم
  onDeleteAll,       // ✅ حذف كل المحادثات
  isMobile = false,
  isTablet = false,
}) {
  // ===== ✅ حالات محلية =====
  const [searchTerm, setSearchTerm] = useState("");
  const [activityFilter, setActivityFilter] = useState("all");

  // ===== ✅ تجميع المحادثات حسب المستخدم =====
  const userFolders = useMemo(() => {
    if (!allChats || allChats.length === 0) return [];

    // 1. تجميع المحادثات حسب user_id
    const grouped = {};
    for (const chat of allChats) {
      const uid = chat.user_id;
      if (!uid) continue;
      if (!grouped[uid]) grouped[uid] = [];
      grouped[uid].push(chat);
    }

    // 2. تحويلها لمصفوفة من كائنات { user, chats, lastActivity }
    const folders = Object.keys(grouped).map((userId) => {
      const chats = grouped[userId];
      const user = getUserById(userId);

      // آخر نشاط
      const lastActivity = chats.reduce((latest, chat) => {
        const t = new Date(chat.updated_at).getTime();
        return t > latest ? t : latest;
      }, 0);

      return {
        user: user || {
          id: userId,
          name: "مستخدم محذوف",
          email: userId?.slice(0, 8) || "—",
        },
        chats,
        lastActivity,
      };
    });

    // 3. ترتيب حسب آخر نشاط (الأحدث أولًا)
    folders.sort((a, b) => b.lastActivity - a.lastActivity);

    return folders;
  }, [allChats, getUserById]);

  // ===== ✅ تطبيق البحث + الفلتر =====
  const filteredFolders = useMemo(() => {
    let result = userFolders;

    // فلتر آخر نشاط
    if (activityFilter !== "all") {
      const now = Date.now();
      const thresholds = {
        today: 24 * 60 * 60 * 1000,          // 24 ساعة
        week: 7 * 24 * 60 * 60 * 1000,        // أسبوع
        month: 30 * 24 * 60 * 60 * 1000,      // شهر
      };

      if (activityFilter === "inactive") {
        // غير نشط = أكثر من 30 يوم
        result = result.filter(
          (f) => now - f.lastActivity > thresholds.month
        );
      } else if (thresholds[activityFilter]) {
        result = result.filter(
          (f) => now - f.lastActivity <= thresholds[activityFilter]
        );
      }
    }

    // بحث بالاسم/البريد
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter((f) => {
        const name = (f.user.name || "").toLowerCase();
        const email = (f.user.email || "").toLowerCase();
        return name.includes(term) || email.includes(term);
      });
    }

    return result;
  }, [userFolders, searchTerm, activityFilter]);

  // ===== ✅ إحصائيات علوية =====
  const stats = useMemo(() => {
    const totalUsers = userFolders.length;
    const totalChats = allChats.length;
    const mostRecent = userFolders[0]?.lastActivity;

    return { totalUsers, totalChats, mostRecent };
  }, [userFolders, allChats]);

  // ===== ✅ أنماط =====
  const containerStyle = useMemo(
    () => ({
      background: theme.surface,
      borderRadius: "16px",
      padding: isMobile ? "12px" : "16px",
      border: `1px solid ${theme.border}`,
    }),
    [theme.surface, theme.border, isMobile]
  );

  const headerStyle = useMemo(
    () => ({
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      flexDirection: isMobile ? "column" : "row",
      flexWrap: "wrap",
      gap: isMobile ? "8px" : "12px",
      marginBottom: isMobile ? "12px" : "16px",
    }),
    [isMobile]
  );

  const titleStyle = useMemo(
    () => ({
      margin: 0,
      fontSize: isMobile ? "16px" : "18px",
    }),
    [isMobile]
  );

  const subtitleStyle = useMemo(
    () => ({
      fontSize: isMobile ? "12px" : "13px",
      opacity: 0.6,
      marginTop: "2px",
    }),
    [isMobile]
  );

  const statsBarStyle = useMemo(
    () => ({
      display: "flex",
      gap: isMobile ? "6px" : "8px",
      flexWrap: "wrap",
      marginBottom: isMobile ? "10px" : "14px",
    }),
    [isMobile]
  );

  const statBadgeStyle = useMemo(
    () => ({
      background: theme.inputBg,
      padding: isMobile ? "5px 10px" : "6px 12px",
      borderRadius: "10px",
      fontSize: isMobile ? "11px" : "12px",
      color: theme.text,
      display: "flex",
      alignItems: "center",
      gap: "4px",
      whiteSpace: "nowrap",
    }),
    [theme.inputBg, theme.text, isMobile]
  );

  const filtersRowStyle = useMemo(
    () => ({
      display: "flex",
      gap: isMobile ? "8px" : "6px",
      flexWrap: "wrap",
      flexDirection: isMobile ? "column" : "row",
      marginBottom: isMobile ? "12px" : "16px",
    }),
    [isMobile]
  );

  const filterControlStyle = useMemo(
    () => ({
      ...inputStyle,
      flex: isMobile ? "initial" : 1,
      width: isMobile ? "100%" : "auto",
      minWidth: isMobile ? "0" : "140px",
    }),
    [inputStyle, isMobile]
  );

  const refreshBtnStyle = useMemo(
    () => ({
      background: "rgba(16,185,129,0.15)",
      color: "#10b981",
      border: "none",
      padding: isMobile ? "10px 14px" : "8px 14px",
      borderRadius: "10px",
      cursor: "pointer",
      fontSize: "14px",
      fontFamily: "inherit",
      minHeight: isMobile ? "40px" : "auto",
    }),
    [isMobile]
  );

  const foldersContainerStyle = useMemo(
    () => ({
      display: "grid",
      gridTemplateColumns: isMobile
        ? "1fr"
        : isTablet
        ? "repeat(2, 1fr)"
        : "repeat(auto-fill, minmax(320px, 1fr))",
      gap: isMobile ? "8px" : "12px",
    }),
    [isMobile, isTablet]
  );

  const emptyStateStyle = useMemo(
    () => ({
      textAlign: "center",
      padding: isMobile ? "40px 20px" : "60px 20px",
      opacity: 0.5,
    }),
    [isMobile]
  );

  // ===== ✅ Handlers =====
  const handleRefresh = useCallback(() => {
    if (typeof onRefresh === "function") onRefresh();
  }, [onRefresh]);

  const handleOpenUser = useCallback(
    (userId, userName) => {
      if (typeof onOpenUserChats === "function") {
        onOpenUserChats(userId, userName);
      }
    },
    [onOpenUserChats]
  );

  const handleSearchChange = useCallback(
    (e) => setSearchTerm(e.target.value),
    []
  );

  const handleActivityChange = useCallback(
    (e) => setActivityFilter(e.target.value),
    []
  );

  const handleClearFilters = useCallback(() => {
    setSearchTerm("");
    setActivityFilter("all");
  }, []);

  // ===== JSX =====
  return (
    <div style={containerStyle}>
      {/* ===== الرأس ===== */}
      <div style={headerStyle}>
        <div>
          <h2 style={titleStyle}>💬 محادثات المستخدمين</h2>
          <div style={subtitleStyle}>
            اضغط على أي مستخدم لعرض محادثاته
          </div>
        </div>
      </div>

      {/* ===== إحصائيات ===== */}
      <div style={statsBarStyle}>
        <div style={statBadgeStyle}>
          👥 <strong>{stats.totalUsers}</strong> مستخدم
        </div>
        <div style={statBadgeStyle}>
          💬 <strong>{stats.totalChats}</strong> محادثة
        </div>
        {filteredFolders.length !== stats.totalUsers && (
          <div
            style={{
              ...statBadgeStyle,
              background: "rgba(16,185,129,0.15)",
              color: "#10b981",
            }}
          >
            🔍 معروض: <strong>{filteredFolders.length}</strong>
          </div>
        )}
      </div>

      {/* ===== الفلاتر ===== */}
      <div style={filtersRowStyle}>
        <input
          type="text"
          placeholder="🔍 ابحث بالاسم أو البريد..."
          value={searchTerm}
          onChange={handleSearchChange}
          style={filterControlStyle}
          aria-label="بحث عن مستخدم"
        />

        <select
          value={activityFilter}
          onChange={handleActivityChange}
          style={filterControlStyle}
          aria-label="فلتر آخر نشاط"
        >
          <option value="all">🕐 الكل</option>
          <option value="today">نشط اليوم</option>
          <option value="week">آخر أسبوع</option>
          <option value="month">آخر شهر</option>
          <option value="inactive">غير نشط (+30 يوم)</option>
        </select>

        <button
          onClick={handleRefresh}
          style={refreshBtnStyle}
          aria-label="تحديث"
          title="تحديث"
        >
          🔄
        </button>
      </div>

      {/* ===== قائمة المجلدات ===== */}
      {filteredFolders.length === 0 ? (
        <div style={emptyStateStyle}>
          {userFolders.length === 0 ? (
            <>
              <div style={{ fontSize: "48px", marginBottom: "12px" }}>💬</div>
              <div style={{ fontSize: "15px" }}>لا توجد محادثات بعد</div>
              <div style={{ fontSize: "13px", marginTop: "6px" }}>
                عندما يبدأ المستخدمون بالدردشة، ستظهر محادثاتهم هنا
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: "48px", marginBottom: "12px" }}>🔍</div>
              <div style={{ fontSize: "15px" }}>لا توجد نتائج مطابقة</div>
              <button
                onClick={handleClearFilters}
                style={{
                  marginTop: "12px",
                  background: "rgba(16,185,129,0.15)",
                  color: "#10b981",
                  border: "1px solid rgba(16,185,129,0.3)",
                  padding: "8px 16px",
                  borderRadius: "10px",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: "600",
                  fontFamily: "inherit",
                }}
              >
                🔄 مسح الفلاتر
              </button>
            </>
          )}
        </div>
      ) : (
        <div style={foldersContainerStyle}>
          {filteredFolders.map((folder) => (
            <UserFolderCard
              key={folder.user.id}
              user={folder.user}
              userChats={folder.chats}
              theme={theme}
              isMobile={isMobile}
              isTablet={isTablet}
              onOpen={handleOpenUser}
            />
          ))}
        </div>
      )}
    </div>
  );
}
