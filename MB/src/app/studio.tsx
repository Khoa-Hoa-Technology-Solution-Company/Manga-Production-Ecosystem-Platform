import { useState, useRef, useEffect } from 'react';
import {
  ImageBackground,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  Dimensions,
  GestureResponderEvent,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import {
  ArrowRight,
  Brush,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  LayoutGrid,
  Layers3,
  Maximize2,
  Move,
  PenTool,
  Plus,
  Sparkles,
  Trash2,
  Users2,
  ZoomIn,
  ZoomOut,
  SplitSquareHorizontal,
  SplitSquareVertical,
  CheckCircle,
  Clock,
  Briefcase,
  Layers,
  ArrowUpRight,
  TrendingUp,
  Wallet,
  DollarSign,
  AlertCircle,
  UploadCloud,
  Check,
  Activity,
  X,
} from 'lucide-react-native';

import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { seriesAPI, chaptersAPI, pagesAPI, zonesAPI, tasksAPI, dashboardAPI, getImageUrl } from '@/lib/api';

const { width: screenWidth } = Dimensions.get('window');

const roles = [
  { id: 'editor', title: 'Editor', desc: 'Chia vùng, vẽ phân cảnh truyện trên mobile.', icon: Layers3, accent: '#0ea5e9' },
  { id: 'uploader', title: 'Uploader', desc: 'Sắp trang, đăng chương mới, duyệt chất lượng.', icon: Plus, accent: '#22c55e' },
  { id: 'manager', title: 'Manager', desc: 'Theo dõi tiến độ, duyệt nội dung và phân phối việc.', icon: Users2, accent: '#8b5cf6' },
  { id: 'assistant', title: 'Assistant', desc: 'Nhận việc tự do, theo dõi thu nhập và hoàn thành task.', icon: Briefcase, accent: '#f43f5e' },
];

const zoneTypes = [
  { key: 'background', label: 'Khung Nền', color: '#3b82f6' },
  { key: 'characters', label: 'Nhân Vật', color: '#f97316' },
  { key: 'effects', label: 'Hiệu Ứng', color: '#a855f7' },
  { key: 'dialog', label: 'Thoại', color: '#22c55e' },
  { key: 'sfx', label: 'Âm Thanh', color: '#eab308' },
];

interface Zone {
  id: string;
  name: string;
  type: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
}

export default function StudioScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  // Roles & Switchers
  const [activeRole, setActiveRole] = useState(() => {
    if (user?.role === 'assistant') return 'assistant';
    if (user?.role === 'editor') return 'editor';
    if (user?.role === 'mangaka') return 'manager';
    return 'assistant';
  });
  const [canvasTool, setCanvasTool] = useState<'select' | 'zone' | 'paint' | 'text'>('zone');
  const [zoom, setZoom] = useState(100);

  // Manga pages thumbnail strip state
  const [mangaPages, setMangaPages] = useState<any[]>([
    { id: 'p1', num: 1, img: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=300&q=80' },
    { id: 'p2', num: 2, img: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?auto=format&fit=crop&w=300&q=80' },
    { id: 'p12', num: 12, img: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=600&q=80' },
  ]);
  const [activePageIdx, setActivePageIdx] = useState(2); // Page 12

  // Zones State (Panel segments drawn on canvas)
  const [zones, setZones] = useState<Zone[]>([
    { id: 'z1', name: 'Phân Vùng Nền', type: 'background', color: '#3b82f6', x: 20, y: 30, width: 290, height: 100, visible: true },
    { id: 'z2', name: 'Nhân Vật Kaito', type: 'characters', color: '#f97316', x: 40, y: 150, width: 140, height: 180, visible: true },
    { id: 'z3', name: 'Bóng Thoại', type: 'dialog', color: '#22c55e', x: 190, y: 170, width: 120, height: 90, visible: true },
  ]);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>('z2');

  // Interactive drawing states
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawCurrent, setDrawCurrent] = useState<{ x: number; y: number } | null>(null);
  const [brushLines, setBrushLines] = useState<{ points: { x: number; y: number }[] }[]>([]);
  const [textOverlays, setTextOverlays] = useState<{ id: string; x: number; y: number; text: string }[]>([
    { id: 't1', x: 200, y: 200, text: 'RÚT KIẾM!' }
  ]);

  // Kanban Tasks list for Manager role
  const [kanbanTasks, setKanbanTasks] = useState<any[]>([]);

  // Freelance Assistant states & task list
  const [assistantTab, setAssistantTab] = useState<'all' | 'available' | 'progress' | 'review' | 'completed'>('all');
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutMethod, setPayoutMethod] = useState<'bank' | 'momo' | 'paypal'>('bank');
  const [payoutAmount, setPayoutAmount] = useState('1500000'); // 1,500,000 VND
  const [payoutSuccess, setPayoutSuccess] = useState(false);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [totalEarnings, setTotalEarnings] = useState(user?.totalEarnings || 0);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadingTaskId, setUploadingTaskId] = useState<string | null>(null);
  const [freelanceTasks, setFreelanceTasks] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // ── API Fetching Cascades ──────────────────────────
  const loadData = () => {
    setError(null);

    // 1. Fetch Assistant Freelance Tasks
    tasksAPI.getAll()
      .then((data) => {
        const mapped = (data.tasks || []).map((t: any) => ({
          id: t._id,
          title: t.title || `${t.type || 'Nhiệm vụ'} Manga`,
          series: t.seriesId?.title || 'Tác phẩm',
          reward: (t.wage || 0).toLocaleString('vi-VN'),
          rewardNum: t.wage || 0,
          deadline: t.deadline ? new Date(t.deadline).toLocaleDateString('vi-VN') : '1 ngày',
          status: t.status === 'open' 
            ? 'available' 
            : (t.status === 'assigned' || t.status === 'in_progress') 
              ? 'progress' 
              : t.status === 'review' 
                ? 'review' 
                : 'completed',
          desc: t.description || 'Nhiệm vụ sản xuất truyện tranh của hệ thống.',
        }));
        setFreelanceTasks(mapped);
      })
      .catch((err) => {
        console.error('Studio fetch tasks error:', err);
        setError(err.message || 'Không thể kết nối đến máy chủ.');
      });

    // 2. Fetch Kanban Tasks for Manager
    dashboardAPI.getWorkflow()
      .then((data) => {
        const flow = data.workflow || {};
        const mappedKanban: any[] = [];
        
        if (flow.Draft) {
          flow.Draft.forEach((c: any) => {
            mappedKanban.push({
              id: c._id,
              title: c.title || `Chương ${c.chapterNumber}`,
              role: c.seriesId?.title || 'Tác phẩm',
              status: 'To Do',
              note: `Chương số ${c.chapterNumber} đang phác thảo.`,
            });
          });
        }
        
        if (flow.Reviewing) {
          flow.Reviewing.forEach((c: any) => {
            mappedKanban.push({
              id: c._id,
              title: c.title || `Chương ${c.chapterNumber}`,
              role: c.seriesId?.title || 'Tác phẩm',
              status: 'In Progress',
              note: `Đang kiểm duyệt chất lượng chương truyện.`,
            });
          });
        }
        
        if (flow.Approved) {
          flow.Approved.forEach((c: any) => {
            mappedKanban.push({
              id: c._id,
              title: c.title || `Chương ${c.chapterNumber}`,
              role: c.seriesId?.title || 'Tác phẩm',
              status: 'Review',
              note: `Đã duyệt. Sắp xếp để phát hành lên hệ thống.`,
            });
          });
        }
        
        if (flow.Published) {
          flow.Published.forEach((c: any) => {
            mappedKanban.push({
              id: c._id,
              title: c.title || `Chương ${c.chapterNumber}`,
              role: c.seriesId?.title || 'Tác phẩm',
              status: 'Approved',
              note: `Đã phát hành và mở khóa cho độc giả đọc.`,
            });
          });
        }
        
        setKanbanTasks(mappedKanban);
      })
      .catch((err) => {
        console.error('Studio fetch workflow error:', err);
        setError(err.message || 'Không thể kết nối đến máy chủ.');
      });

    // 3. Fetch Editor Pages list (Cascade series -> chapters -> pages)
    seriesAPI.getAll({ limit: '1' })
      .then((sData) => {
        const firstSeries = sData.series?.[0];
        if (firstSeries) {
          return chaptersAPI.getBySeries(firstSeries._id);
        }
        throw new Error('No series');
      })
      .then((cData) => {
        const firstChapter = cData.chapters?.[0];
        if (firstChapter) {
          return pagesAPI.getByChapter(firstChapter._id);
        }
        throw new Error('No chapter');
      })
      .then((pData) => {
        const fetchedPages = (pData.pages || []).map((p: any, idx: number) => ({
          id: p._id,
          num: idx + 1,
          img: getImageUrl(p.imageUrl) || `https://picsum.photos/seed/${p._id}/600/800`,
        }));
        if (fetchedPages.length > 0) {
          setMangaPages(fetchedPages);
          setActivePageIdx(0);
        }
      })
      .catch((err) => {
        console.error('Studio fetch editor cascade error:', err);
      });

    // 4. Fetch Stats for total earnings
    dashboardAPI.getStats()
      .then((data) => {
        if (data.stats && data.stats.totalEarnings !== undefined) {
          setTotalEarnings(data.stats.totalEarnings);
        }
      })
      .catch((err) => {
        console.error('Studio fetch stats error:', err);
      });
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Sync zones when active page changes
  useEffect(() => {
    const activePage = mangaPages[activePageIdx];
    if (!activePage) return;

    zonesAPI.getByPage(activePage.id)
      .then((data) => {
        const mappedZones = (data.zones || []).map((z: any) => ({
          id: z._id,
          name: z.name || 'Vùng mới vẽ',
          type: z.type || 'background',
          color: zoneTypes.find((t) => t.key === z.type)?.color || '#3b82f6',
          x: z.x || 20,
          y: z.y || 30,
          width: z.width || 100,
          height: z.height || 100,
          visible: true,
        }));
        if (mappedZones.length > 0) {
          setZones(mappedZones);
        }
      })
      .catch(() => {});
  }, [activePageIdx, mangaPages]);

  const handleAcceptFreelanceTask = (id: string) => {
    tasksAPI.accept(id)
      .then(() => {
        setFreelanceTasks((prev) =>
          prev.map((t) => (t.id === id ? { ...t, status: 'progress' } : t))
        );
        Alert.alert("Thành công", "Bạn đã nhận nhiệm vụ freelance này.");
      })
      .catch((err) => {
        console.error('Accept task error:', err);
        Alert.alert("Lỗi", err.message || "Không thể nhận nhiệm vụ này.");
      });
  };

  const handleSubmitFreelanceTask = (id: string) => {
    setUploadingTaskId(id);
    setUploadProgress((prev) => ({ ...prev, [id]: 0 }));
    
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setUploadProgress((prev) => ({ ...prev, [id]: progress }));
      
      if (progress >= 100) {
        clearInterval(interval);
        
        const formData = new FormData();
        formData.append('file', {
          uri: 'https://picsum.photos/seed/task/600/800',
          name: 'submission.jpg',
          type: 'image/jpeg',
        } as any);

        tasksAPI.submit(id, formData)
          .then(() => {
            setFreelanceTasks((prev) =>
              prev.map((t) => (t.id === id ? { ...t, status: 'review' } : t))
            );
            Alert.alert("Thành công", "Đã nộp kết quả công việc thành công.");
          })
          .catch((err) => {
            console.error('Submit task error:', err);
            Alert.alert("Lỗi", err.message || "Không thể nộp kết quả.");
          })
          .finally(() => {
            setUploadingTaskId(null);
          });
      }
    }, 120);
  };

  const handleWithdraw = () => {
    if (Number(payoutAmount) <= 0 || Number(payoutAmount) > totalEarnings) return;
    setPayoutLoading(true);
    setTimeout(() => {
      setPayoutLoading(false);
      setPayoutSuccess(true);
      setTimeout(() => {
        setTotalEarnings((prev: number) => prev - Number(payoutAmount));
        setPayoutSuccess(false);
        setShowPayoutModal(false);
      }, 1600);
    }, 1500);
  };

  const selectedZone = zones.find((z) => z.id === selectedZoneId);

  // Core Drawing responder logic for Canvas
  const handleCanvasTouchStart = (e: GestureResponderEvent) => {
    const { locationX, locationY } = e.nativeEvent;
    
    if (canvasTool === 'zone') {
      setDrawStart({ x: locationX, y: locationY });
      setDrawCurrent({ x: locationX, y: locationY });
    } else if (canvasTool === 'paint') {
      setBrushLines((prev) => [...prev, { points: [{ x: locationX, y: locationY }] }]);
    } else if (canvasTool === 'text') {
      const newText = {
        id: Date.now().toString(),
        x: locationX - 40,
        y: locationY - 12,
        text: 'Chạm để sửa...',
      };
      setTextOverlays((prev) => [...prev, newText]);
    }
  };

  const handleCanvasTouchMove = (e: GestureResponderEvent) => {
    const { locationX, locationY } = e.nativeEvent;
    
    if (canvasTool === 'zone' && drawStart) {
      setDrawCurrent({ x: locationX, y: locationY });
    } else if (canvasTool === 'paint' && brushLines.length > 0) {
      setBrushLines((prev) => {
        const next = [...prev];
        const currentLine = next[next.length - 1];
        currentLine.points = [...currentLine.points, { x: locationX, y: locationY }];
        return next;
      });
    }
  };

  const handleCanvasTouchEnd = () => {
    if (canvasTool === 'zone' && drawStart && drawCurrent) {
      const width = Math.abs(drawCurrent.x - drawStart.x);
      const height = Math.abs(drawCurrent.y - drawStart.y);
      const x = Math.min(drawStart.x, drawCurrent.x);
      const y = Math.min(drawStart.y, drawCurrent.y);

      if (width > 20 && height > 20) {
        const newId = 'z_' + Date.now();
        const newZone: Zone = {
          id: newId,
          name: `Khung ${zones.length + 1}`,
          type: 'background',
          color: '#3b82f6',
          x,
          y,
          width,
          height,
          visible: true,
        };
        setZones((prev) => [...prev, newZone]);
        setSelectedZoneId(newId);
      }
    }
    setDrawStart(null);
    setDrawCurrent(null);
  };

  // Drag-to-Resize & Move Logic using custom touch overlay on selected box
  const handleMoveZone = (dx: number, dy: number) => {
    if (!selectedZoneId) return;
    setZones((prev) =>
      prev.map((z) =>
        z.id === selectedZoneId
          ? {
              ...z,
              x: Math.max(0, Math.min(280, z.x + dx)),
              y: Math.max(0, Math.min(320, z.y + dy)),
            }
          : z
      )
    );
  };

  const handleResizeZone = (dx: number, dy: number) => {
    if (!selectedZoneId) return;
    setZones((prev) =>
      prev.map((z) =>
        z.id === selectedZoneId
          ? {
              ...z,
              width: Math.max(30, z.width + dx),
              height: Math.max(30, z.height + dy),
            }
          : z
      )
    );
  };

  // Add mock page
  const handleAddPage = () => {
    const newNum = mangaPages[mangaPages.length - 1].num + 1;
    const newPage = {
      id: 'p_' + Date.now(),
      num: newNum,
      img: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80',
    };
    setMangaPages((prev) => [...prev, newPage]);
    setActivePageIdx(mangaPages.length);
  };

  // Delete page
  const handleDeletePage = (id: string) => {
    if (mangaPages.length <= 1) return;
    setMangaPages((prev) => prev.filter((p) => p.id !== id));
    setActivePageIdx(0);
  };

  // Kanban task status transition
  const handleTransitionTask = (taskId: string, nextStatus: string) => {
    const dbStatusMap: Record<string, string> = {
      'To Do': 'Draft',
      'In Progress': 'Reviewing',
      'Review': 'Approved',
      'Approved': 'Published',
    };
    const dbStatus = dbStatusMap[nextStatus] || 'Draft';
    
    chaptersAPI.updateStatus(taskId, dbStatus)
      .then(() => {
        setKanbanTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: nextStatus } : t))
        );
        Alert.alert("Thành công", `Đã chuyển chương sang trạng thái ${nextStatus}.`);
      })
      .catch((err) => {
        console.error('Transition task error:', err);
        Alert.alert("Lỗi phân quyền hoặc kết nối", err.message || "Không thể chuyển đổi trạng thái chương này.");
      });
  };

  return (
    <ThemedView style={[styles.screen, { backgroundColor: '#07020d' }]}>
      <LinearGradient colors={['#0e051d', '#07020e']} style={StyleSheet.absoluteFillObject} />

      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: BottomTabInset + insets.bottom + Spacing.four },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <ThemedView style={styles.heroCard}>
            <View style={styles.heroTop}>
              <View style={{ flex: 1 }}>
                <ThemedText type="small" style={styles.topBadgeText}>CREATOR STUDIO</ThemedText>
                <ThemedText type="title" style={styles.heroTitle}>Manga Workspace</ThemedText>
                <ThemedText style={styles.heroDesc}>
                  Không gian sản xuất truyện tối ưu cho thiết bị di động. Phân vùng trang, duyệt chương, quản trị tiến độ nhóm.
                </ThemedText>
              </View>
              <View style={styles.heroIcon}><Sparkles size={24} color="#fff" /></View>
            </View>
          </ThemedView>

          {error && (
            <View style={styles.errorBanner}>
              <Sparkles size={16} color="#fb7185" />
              <ThemedText style={styles.errorBannerText}>{error}</ThemedText>
              <Pressable onPress={loadData} style={styles.retryBtn}>
                <ThemedText style={styles.retryText}>Thử lại</ThemedText>
              </Pressable>
            </View>
          )}

          {/* Role CTA Selector Strip */}
          <View style={styles.roleStrip}>
            {roles.map((role) => {
              const Icon = role.icon;
              const active = activeRole === role.id;
              return (
                <Pressable
                  key={role.id}
                  onPress={() => setActiveRole(role.id)}
                  style={[
                    styles.roleCard,
                    active && { borderColor: role.accent, backgroundColor: 'rgba(255,255,255,0.06)' },
                  ]}
                >
                  <View style={[styles.roleIconWrap, { backgroundColor: role.accent }]}>
                    <Icon size={14} color="#fff" />
                  </View>
                  <ThemedText style={[styles.roleTitle, active && { color: '#fff' }]}>{role.title}</ThemedText>
                  <ThemedText style={styles.roleDescText} numberOfLines={2}>{role.desc}</ThemedText>
                </Pressable>
              );
            })}
          </View>

          {activeRole === 'editor' && (
            /* EDITOR SITE - CANVAS SEGMENTER & DRAWER */
            <View style={styles.workspaceGrid}>
              
              {/* Canvas Controls Toolbar */}
              <ThemedView style={styles.toolCard}>
                <View style={styles.sectionHeader}>
                  <ThemedText type="smallBold" style={styles.sectionTitle}>HỘP CÔNG CỤ CANVAS</ThemedText>
                  <ThemedText style={styles.zoomPillText}>Zoom: {zoom}%</ThemedText>
                </View>
                
                <View style={styles.modeRow}>
                  {[
                    { key: 'select', label: 'Chọn', icon: Move },
                    { key: 'zone', label: 'Vẽ Vùng', icon: LayoutGrid },
                    { key: 'paint', label: 'Brush', icon: Brush },
                    { key: 'text', label: 'Chữ', icon: PenTool },
                  ].map((item) => {
                    const Icon = item.icon;
                    const active = canvasTool === item.key;
                    return (
                      <Pressable
                        key={item.key}
                        onPress={() => setCanvasTool(item.key as any)}
                        style={[styles.toolChip, active && styles.toolChipActive]}
                      >
                        <Icon size={13} color={active ? '#0a051d' : '#fff'} />
                        <ThemedText style={[styles.toolChipText, active && { color: '#0a051d' }]}>{item.label}</ThemedText>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={styles.canvasActionsRow}>
                  <View style={styles.zoomGroup}>
                    <Pressable onPress={() => setZoom((z) => Math.max(50, z - 10))} style={styles.zoomBtn}><ZoomOut size={14} color="#fff" /></Pressable>
                    <Pressable onPress={() => setZoom((z) => Math.min(150, z + 10))} style={styles.zoomBtn}><ZoomIn size={14} color="#fff" /></Pressable>
                    <Pressable onPress={() => setZoom(100)} style={styles.zoomResetBtn}><ThemedText style={styles.zoomResetText}>Reset</ThemedText></Pressable>
                  </View>

                  <Pressable
                    onPress={() => {
                      setZones([
                        { id: 'z1', name: 'Phân Vùng Nền', type: 'background', color: '#3b82f6', x: 20, y: 30, width: 290, height: 100, visible: true },
                        { id: 'z2', name: 'Nhân Vật Kaito', type: 'characters', color: '#f97316', x: 40, y: 150, width: 140, height: 180, visible: true },
                        { id: 'z3', name: 'Bóng Thoại', type: 'dialog', color: '#22c55e', x: 190, y: 170, width: 120, height: 90, visible: true },
                      ]);
                      setBrushLines([]);
                      setTextOverlays([{ id: 't1', x: 200, y: 200, text: 'RÚT KIẾM!' }]);
                    }}
                    style={styles.clearBtn}
                  >
                    <Trash2 size={13} color="#fff" />
                    <ThemedText style={styles.clearBtnText}>Xóa Bản Vẽ</ThemedText>
                  </Pressable>
                </View>
              </ThemedView>

              {/* Touch-Native Comic Canvas (Vẽ phân vùng) */}
              <ThemedView style={styles.canvasContainerCard}>
                <View style={styles.sectionHeader}>
                  <ThemedText type="smallBold" style={styles.sectionTitle}>BẢN VẼ PHÂN VÙNG TRANG 12</ThemedText>
                  <View style={styles.greenPill}><ThemedText style={styles.greenPillText}>Đang Biên Tập</ThemedText></View>
                </View>

                {/* Canvas Bounding Area */}
                <View
                  style={styles.canvasViewport}
                  onTouchStart={handleCanvasTouchStart}
                  onTouchMove={handleCanvasTouchMove}
                  onTouchEnd={handleCanvasTouchEnd}
                >
                  <ImageBackground
                    source={{ uri: mangaPages[activePageIdx].img }}
                    style={styles.canvasBg}
                    imageStyle={{ borderRadius: 16 }}
                  >
                    {/* Zones (Panel selections overlay) */}
                    {zones.map((zone) => {
                      if (!zone.visible) return null;
                      const active = selectedZoneId === zone.id;
                      return (
                        <Pressable
                          key={zone.id}
                          onPress={() => setSelectedZoneId(zone.id)}
                          style={[
                            styles.zoneBox,
                            {
                              left: zone.x,
                              top: zone.y,
                              width: zone.width,
                              height: zone.height,
                              borderColor: zone.color,
                              backgroundColor: active ? `${zone.color}25` : `${zone.color}08`,
                            },
                          ]}
                        >
                          <View style={[styles.zoneBoxLabel, { backgroundColor: zone.color }]}>
                            <ThemedText style={styles.zoneBoxLabelText}>{zone.name}</ThemedText>
                          </View>

                          {/* Resize Handles (Showed only when selected & select tool active) */}
                          {active && canvasTool === 'select' && (
                            <>
                              {/* Bottom-right anchor circular grip handle */}
                              <View
                                style={[styles.resizeAnchorGrip, { right: -6, bottom: -6 }]}
                                onStartShouldSetResponder={() => true}
                                onResponderMove={(ev) => {
                                  const { pageX, pageY } = ev.nativeEvent;
                                  handleResizeZone(2, 2);
                                }}
                              />
                              {/* Center translation grip */}
                              <View
                                style={[styles.resizeAnchorGrip, { left: '50%', top: '50%', marginLeft: -6, marginTop: -6, backgroundColor: '#fff', borderRadius: 2 }]}
                                onStartShouldSetResponder={() => true}
                                onResponderMove={(ev) => {
                                  handleMoveZone(2, 2);
                                }}
                              />
                            </>
                          )}
                        </Pressable>
                      );
                    })}

                    {/* Paint brush custom lines overlays */}
                    {brushLines.map((line, idx) => (
                      <View key={idx} style={StyleSheet.absoluteFillObject} pointerEvents="none">
                        {line.points.map((pt, pIdx) => (
                          <View
                            key={pIdx}
                            style={[
                              styles.paintDot,
                              { left: pt.x, top: pt.y },
                            ]}
                          />
                        ))}
                      </View>
                    ))}

                    {/* Text dialogues overlays */}
                    {textOverlays.map((t) => (
                      <View
                        key={t.id}
                        style={[styles.textOverlayBox, { left: t.x, top: t.y }]}
                      >
                        <ThemedText style={styles.textOverlayContent}>{t.text}</ThemedText>
                      </View>
                    ))}

                    {/* Current Drag Rectangle Overlay (Dashed rectangle feedback) */}
                    {canvasTool === 'zone' && drawStart && drawCurrent && (
                      <View
                        style={[
                          styles.dragDashedBox,
                          {
                            left: Math.min(drawStart.x, drawCurrent.x),
                            top: Math.min(drawStart.y, drawCurrent.y),
                            width: Math.abs(drawCurrent.x - drawStart.x),
                            height: Math.abs(drawCurrent.y - drawStart.y),
                          },
                        ]}
                      />
                    )}
                  </ImageBackground>
                </View>
                <ThemedText style={styles.canvasTip}>
                  {canvasTool === 'zone'
                    ? 'Chạm vuốt kéo ngón tay để vẽ khung phân vùng mới.'
                    : canvasTool === 'select'
                    ? 'Chạm vào khung để di chuyển và thay đổi kích thước.'
                    : canvasTool === 'paint'
                    ? 'Di ngón tay để tô vẽ phát họa lên trang vẽ.'
                    : 'Chạm để chèn bong bóng đối thoại mới.'}
                </ThemedText>
              </ThemedView>

              {/* Zone details sidebar list panel */}
              <ThemedView style={styles.zonesCard}>
                <View style={styles.sectionHeader}>
                  <ThemedText type="smallBold" style={styles.sectionTitle}>DANH SÁCH KHUNG TRUYỆN</ThemedText>
                  <ThemedText style={styles.zoneCountText}>{zones.length} phân vùng</ThemedText>
                </View>

                <View style={styles.zonesChecklist}>
                  {zones.map((zone) => {
                    const active = selectedZoneId === zone.id;
                    return (
                      <Pressable
                        key={zone.id}
                        onPress={() => setSelectedZoneId(zone.id)}
                        style={[
                          styles.zoneCheckItem,
                          active && styles.zoneCheckItemActive,
                        ]}
                      >
                        <View style={styles.zoneCheckLabelRow}>
                          <Pressable
                            onPress={() =>
                              setZones((prev) =>
                                prev.map((z) => (z.id === zone.id ? { ...z, visible: !z.visible } : z))
                              )
                            }
                            style={styles.eyeToggleBtn}
                          >
                            {zone.visible ? (
                              <Eye size={13} color="#fff" />
                            ) : (
                              <EyeOff size={13} color="#64748b" />
                            )}
                          </Pressable>
                          <View style={[styles.smallColorDot, { backgroundColor: zone.color }]} />
                          <ThemedText style={styles.zoneNameText}>{zone.name}</ThemedText>
                        </View>

                        <ThemedText style={styles.zoneCoordText}>
                          X: {Math.round(zone.x)} Y: {Math.round(zone.y)} • W: {Math.round(zone.width)} H: {Math.round(zone.height)}
                        </ThemedText>

                        {active && (
                          <View style={styles.activeZoneProps}>
                            <ThemedText style={styles.propLabel}>Loại phân vùng:</ThemedText>
                            <View style={styles.propGrid}>
                              {zoneTypes.map((t) => (
                                <Pressable
                                  key={t.key}
                                  onPress={() =>
                                    setZones((prev) =>
                                      prev.map((z) =>
                                        z.id === zone.id ? { ...z, type: t.key, color: t.color } : z
                                      )
                                    )
                                  }
                                  style={[
                                    styles.propChip,
                                    zone.type === t.key && { backgroundColor: t.color },
                                  ]}
                                >
                                  <ThemedText style={styles.propChipText}>{t.label}</ThemedText>
                                </Pressable>
                              ))}
                            </View>

                            <Pressable
                              onPress={() => {
                                setZones((prev) => prev.filter((z) => z.id !== zone.id));
                                setSelectedZoneId(null);
                              }}
                              style={styles.deleteZoneBtn}
                            >
                              <Trash2 size={11} color="#ef4444" />
                              <ThemedText style={styles.deleteZoneText}>Xóa phân vùng này</ThemedText>
                            </Pressable>
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </ThemedView>
            </View>
          )}

          {activeRole === 'uploader' && (
            /* UPLOADER SITE - PAGES MANAGEMENT STACK */
            <ThemedView style={styles.uploaderWorkspace}>
              <View style={styles.sectionHeader}>
                <ThemedText type="smallBold" style={styles.sectionTitle}>QUẢN LÝ DÀN TRANG CHAPTER</ThemedText>
              </View>

              <View style={styles.uploaderBox}>
                <ThemedText style={styles.uploaderBoxTitle}>Tải Lên Trang Truyện Mới</ThemedText>
                <ThemedText style={styles.uploaderBoxSub}>Định dạng PNG, JPG. Dung lượng tối đa 10MB</ThemedText>
                <Pressable onPress={handleAddPage} style={styles.uploadCtaBtn}>
                  <Maximize2 size={16} color="#0a051d" />
                  <ThemedText style={styles.uploadCtaText}>Chọn file từ thiết bị</ThemedText>
                </Pressable>
              </View>

              <View style={styles.pagesGridWrap}>
                <ThemedText style={styles.gridHeading}>Danh Sách Trang ({mangaPages.length})</ThemedText>
                <View style={styles.pagesGrid}>
                  {mangaPages.map((page, idx) => (
                    <View key={page.id} style={styles.pageGridCard}>
                      <Image source={{ uri: page.img }} style={styles.pageGridThumb} contentFit="cover" />
                      <View style={styles.pageGridMeta}>
                        <ThemedText style={styles.pageGridNumText}>Trang {page.num}</ThemedText>
                        <Pressable onPress={() => handleDeletePage(page.id)} style={styles.pageGridTrash}>
                          <Trash2 size={12} color="#ef4444" />
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </ThemedView>
          )}

          {activeRole === 'manager' && (
            /* MANAGER SITE - KANBAN COLLABORATION BOARD */
            <ThemedView style={styles.managerWorkspace}>
              <View style={styles.sectionHeader}>
                <ThemedText type="smallBold" style={styles.sectionTitle}>QUẢN TRỊ TIẾN ĐỘ SẢN XUẤT</ThemedText>
              </View>

              {/* Kanban columns cards */}
              <View style={styles.kanbanContainer}>
                {['To Do', 'In Progress', 'Review', 'Approved'].map((status) => {
                  const tasks = kanbanTasks.filter((t) => t.status === status);
                  return (
                    <View key={status} style={styles.kanbanColumn}>
                      <View style={styles.kanbanColHeader}>
                        <ThemedText style={styles.colTitleText}>{status}</ThemedText>
                        <View style={styles.colCountBadge}><ThemedText style={styles.colCountText}>{tasks.length}</ThemedText></View>
                      </View>

                      <ScrollView style={styles.kanbanCardScroll} showsVerticalScrollIndicator={false}>
                        {tasks.map((task) => (
                          <View key={task.id} style={styles.kanbanCard}>
                            <ThemedText style={styles.kanbanCardTitle}>{task.title}</ThemedText>
                            <ThemedText style={styles.kanbanCardNote}>{task.note}</ThemedText>
                            <View style={styles.kanbanCardFooter}>
                              <View style={styles.kanbanRoleBadge}><ThemedText style={styles.kanbanRoleText}>{task.role}</ThemedText></View>
                              
                              <View style={styles.taskNavActions}>
                                {status !== 'Approved' && (
                                  <Pressable
                                    onPress={() => {
                                      const steps = ['To Do', 'In Progress', 'Review', 'Approved'];
                                      const nextIdx = steps.indexOf(status) + 1;
                                      handleTransitionTask(task.id, steps[nextIdx]);
                                    }}
                                    style={styles.taskNextBtn}
                                  >
                                    <ArrowUpRight size={10} color="#fff" />
                                  </Pressable>
                                )}
                              </View>
                            </View>
                          </View>
                        ))}
                      </ScrollView>
                    </View>
                  );
                })}
              </View>
            </ThemedView>
          )}

          {activeRole === 'assistant' && (
            /* ASSISTANT SITE - FREELANCE PORTAL */
            <ThemedView style={styles.assistantWorkspace}>
              {/* Statistics Grid */}
              <View style={styles.statsGridRow}>
                <View style={styles.statBoxCard}>
                  <View style={[styles.statIconCircle, { backgroundColor: 'rgba(59,130,246,0.1)' }]}>
                    <Clock size={16} color="#3b82f6" />
                  </View>
                  <View>
                    <ThemedText style={styles.statBoxLabel}>Việc Mới</ThemedText>
                    <ThemedText style={styles.statBoxVal}>
                      {freelanceTasks.filter((t) => t.status === 'available').length}
                    </ThemedText>
                  </View>
                </View>

                <View style={styles.statBoxCard}>
                  <View style={[styles.statIconCircle, { backgroundColor: 'rgba(249,115,22,0.1)' }]}>
                    <Activity size={16} color="#f97316" />
                  </View>
                  <View>
                    <ThemedText style={styles.statBoxLabel}>Đang Làm</ThemedText>
                    <ThemedText style={styles.statBoxVal}>
                      {freelanceTasks.filter((t) => t.status === 'progress').length}
                    </ThemedText>
                  </View>
                </View>

                <View style={styles.statBoxCard}>
                  <View style={[styles.statIconCircle, { backgroundColor: 'rgba(34,197,94,0.1)' }]}>
                    <CheckCircle size={16} color="#22c55e" />
                  </View>
                  <View>
                    <ThemedText style={styles.statBoxLabel}>Hoàn Thành</ThemedText>
                    <ThemedText style={styles.statBoxVal}>
                      {freelanceTasks.filter((t) => t.status === 'completed').length}
                    </ThemedText>
                  </View>
                </View>
              </View>

              {/* Earnings Gradient Card */}
              <LinearGradient
                colors={['#e11d48', '#881337']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.earningsCard}
              >
                <View style={styles.earningsTopRow}>
                  <View style={styles.earningsInfoCol}>
                    <View style={styles.walletHeadingRow}>
                      <Wallet size={14} color="#fecdd3" />
                      <ThemedText style={styles.earningsLabelText}>Ví Thu Nhập Khả Dụng</ThemedText>
                    </View>
                    <ThemedText style={styles.earningsValueText}>
                      {totalEarnings.toLocaleString()} đ
                    </ThemedText>
                  </View>
                  <Pressable
                    onPress={() => {
                      setPayoutAmount(totalEarnings.toString());
                      setShowPayoutModal(true);
                    }}
                    style={styles.payoutCtaBtn}
                  >
                    <DollarSign size={14} color="#e11d48" />
                    <ThemedText style={styles.payoutCtaText}>Rút Tiền</ThemedText>
                  </Pressable>
                </View>

                {/* Micro trend chart showing weekly earnings */}
                <View style={styles.chartContainer}>
                  <View style={styles.chartHeader}>
                    <TrendingUp size={12} color="#fecdd3" />
                    <ThemedText style={styles.chartHeaderText}>Biểu đồ doanh thu tuần này</ThemedText>
                  </View>
                  <View style={styles.barsRow}>
                    {[
                      { day: 'T2', amount: '200k', height: '35%' },
                      { day: 'T3', amount: '350k', height: '55%' },
                      { day: 'T4', amount: '150k', height: '25%' },
                      { day: 'T5', amount: '500k', height: '80%' },
                      { day: 'T6', amount: '600k', height: '95%' },
                      { day: 'T7', amount: '450k', height: '70%' },
                      { day: 'CN', amount: '600k', height: '95%', active: true },
                    ].map((item, idx) => (
                      <View key={idx} style={styles.barCol}>
                        <View style={styles.barTrack}>
                          <View
                            style={[
                              styles.barFill,
                              { height: item.height as any },
                              item.active && { backgroundColor: '#fff' },
                            ]}
                          />
                        </View>
                        <ThemedText style={styles.barLabel}>{item.day}</ThemedText>
                      </View>
                    ))}
                  </View>
                </View>
              </LinearGradient>

              {/* Tasks Tab Filter Bar */}
              <View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipRow}>
                  {[
                    { key: 'all', label: 'Tất cả' },
                    { key: 'available', label: 'Việc mới' },
                    { key: 'progress', label: 'Đang làm' },
                    { key: 'review', label: 'Chờ duyệt' },
                    { key: 'completed', label: 'Đã xong' },
                  ].map((tab) => {
                    const active = assistantTab === tab.key;
                    return (
                      <Pressable
                        key={tab.key}
                        onPress={() => setAssistantTab(tab.key as any)}
                        style={[styles.filterChip, active && styles.filterChipActive]}
                      >
                        <ThemedText style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                          {tab.label}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Freelance Tasks Cards */}
              <View style={styles.freelanceTasksContainer}>
                {freelanceTasks
                  .filter((task) => {
                    if (assistantTab === 'all') return true;
                    return task.status === assistantTab;
                  })
                  .map((task) => {
                    const isUploading = uploadingTaskId === task.id;
                    const progress = uploadProgress[task.id] || 0;
                    return (
                      <ThemedView key={task.id} style={styles.freelanceTaskCard}>
                        <View style={styles.taskCardHeader}>
                          <View style={{ flex: 1 }}>
                            <View style={styles.seriesTagRow}>
                              <Sparkles size={10} color="#f43f5e" />
                              <ThemedText style={styles.seriesTagText}>{task.series}</ThemedText>
                            </View>
                            <ThemedText style={styles.taskCardTitle}>{task.title}</ThemedText>
                          </View>

                          <View style={styles.badgeCol}>
                            <View
                              style={[
                                styles.statusIndicatorBadge,
                                task.status === 'available' && { backgroundColor: 'rgba(59,130,246,0.1)', borderColor: 'rgba(59,130,246,0.2)' },
                                task.status === 'progress' && { backgroundColor: 'rgba(249,115,22,0.1)', borderColor: 'rgba(249,115,22,0.2)' },
                                task.status === 'review' && { backgroundColor: 'rgba(139,92,246,0.1)', borderColor: 'rgba(139,92,246,0.2)' },
                                task.status === 'completed' && { backgroundColor: 'rgba(34,197,94,0.1)', borderColor: 'rgba(34,197,94,0.2)' },
                              ]}
                            >
                              <ThemedText
                                style={[
                                  styles.statusBadgeText,
                                  task.status === 'available' && { color: '#3b82f6' },
                                  task.status === 'progress' && { color: '#f97316' },
                                  task.status === 'review' && { color: '#8b5cf6' },
                                  task.status === 'completed' && { color: '#22c55e' },
                                ]}
                              >
                                {task.status === 'available' && 'Việc mới'}
                                {task.status === 'progress' && 'Đang làm'}
                                {task.status === 'review' && 'Chờ duyệt'}
                                {task.status === 'completed' && 'Đã xong'}
                              </ThemedText>
                            </View>
                          </View>
                        </View>

                        <ThemedText style={styles.taskCardDesc}>{task.desc}</ThemedText>

                        <View style={styles.taskCardMetaRow}>
                          <View style={styles.metaCol}>
                            <ThemedText style={styles.metaLabel}>Thù lao</ThemedText>
                            <ThemedText style={styles.metaValueReward}>+{task.reward} đ</ThemedText>
                          </View>

                          <View style={styles.metaCol}>
                            <ThemedText style={styles.metaLabel}>Hạn chót</ThemedText>
                            <ThemedText style={styles.metaValueDeadline}>{task.deadline}</ThemedText>
                          </View>
                        </View>

                        {/* Action buttons based on task state */}
                        <View style={styles.taskActionsWrap}>
                          {task.status === 'available' && (
                            <Pressable
                              onPress={() => handleAcceptFreelanceTask(task.id)}
                              style={styles.taskAcceptBtn}
                            >
                              <Briefcase size={12} color="#fff" />
                              <ThemedText style={styles.taskAcceptBtnText}>Nhận Việc Này</ThemedText>
                            </Pressable>
                          )}

                          {task.status === 'progress' && (
                            <View style={{ width: '100%', gap: 8 }}>
                              {isUploading ? (
                                <View style={styles.progressUploadContainer}>
                                  <View style={styles.progressInfoRow}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                      <UploadCloud size={14} color="#f43f5e" />
                                      <ThemedText style={styles.progressLoadingText}>Đang tải lên sản phẩm...</ThemedText>
                                    </View>
                                    <ThemedText style={styles.progressPercentText}>{progress}%</ThemedText>
                                  </View>
                                  <View style={styles.progressBarTrack}>
                                    <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
                                  </View>
                                </View>
                              ) : (
                                <Pressable
                                  onPress={() => handleSubmitFreelanceTask(task.id)}
                                  style={styles.taskSubmitBtn}
                                >
                                  <UploadCloud size={12} color="#fff" />
                                  <ThemedText style={styles.taskSubmitBtnText}>Nộp Sản Phẩm</ThemedText>
                                </Pressable>
                              )}
                            </View>
                          )}

                          {task.status === 'review' && (
                            <View style={styles.reviewPendingRow}>
                              <AlertCircle size={14} color="#8b5cf6" />
                              <ThemedText style={styles.reviewPendingText}>
                                Đã gửi sản phẩm. Admin đang kiểm tra chất lượng (Chờ duyệt)...
                              </ThemedText>
                            </View>
                          )}

                          {task.status === 'completed' && (
                            <View style={styles.taskCompletedRow}>
                              <CheckCircle size={14} color="#22c55e" />
                              <ThemedText style={styles.taskCompletedText}>
                                Nhiệm vụ đã hoàn thành xuất sắc! Thù lao đã cộng vào ví.
                              </ThemedText>
                            </View>
                          )}
                        </View>
                      </ThemedView>
                    );
                  })}
              </View>
            </ThemedView>
          )}

          {/* Bottom Pages Navigation Thumbnail list bar */}
          {activeRole !== 'assistant' && (
            <ThemedView style={styles.bottomPageSlider}>
              <View style={styles.sectionHeader}>
                <ThemedText type="smallBold" style={styles.sectionTitle}>CÁC TRANG CỦA CHAPTER</ThemedText>
                <Pressable onPress={handleAddPage} style={styles.pageAddBtn}>
                  <Plus size={12} color="#fff" />
                  <ThemedText style={styles.pageAddText}>Thêm trang</ThemedText>
                </Pressable>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pagesScroll}>
                {mangaPages.map((page, idx) => (
                  <Pressable
                    key={page.id}
                    onPress={() => setActivePageIdx(idx)}
                    style={[
                      styles.pageThumbFrame,
                      activePageIdx === idx && styles.pageThumbFrameActive,
                    ]}
                  >
                    <Image source={{ uri: page.img }} style={styles.pageThumbImage} contentFit="cover" />
                    <View style={styles.pageThumbNumWrap}>
                      <ThemedText style={styles.pageThumbNumText}>Trang {page.num}</ThemedText>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </ThemedView>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Glassmorphic payout sheet for secure withdrawal */}
      {showPayoutModal && (
        <View style={styles.payoutOverlay}>
          <Pressable style={styles.payoutDismissHotspot} onPress={() => !payoutLoading && !payoutSuccess && setShowPayoutModal(false)} />
          <View style={styles.payoutSheetContainer}>
            {payoutSuccess ? (
              <View style={styles.successContainer}>
                <View style={styles.successTickWrapper}>
                  <Check size={40} color="#22c55e" />
                </View>
                <ThemedText style={styles.successTitleText}>Rút Tiền Thành Công!</ThemedText>
                <ThemedText style={styles.successAmountText}>
                  -{Number(payoutAmount).toLocaleString()} đ
                </ThemedText>
                <ThemedText style={styles.successSubText}>
                  Giao dịch đang được xử lý an toàn. Tiền sẽ khả dụng trong ví của bạn sau vài phút.
                </ThemedText>
              </View>
            ) : (
              <View style={styles.payoutFormContainer}>
                <View style={styles.payoutFormHeader}>
                  <ThemedText style={styles.payoutFormTitle}>RÚT TIỀN TIỆN LỢI</ThemedText>
                  <Pressable
                    disabled={payoutLoading}
                    onPress={() => setShowPayoutModal(false)}
                    style={styles.payoutCloseBtn}
                  >
                    <X size={18} color="#fff" />
                  </Pressable>
                </View>

                {/* Method selectors */}
                <View style={styles.paymentMethodsRow}>
                  {[
                    { key: 'bank', label: 'Ngân Hàng' },
                    { key: 'momo', label: 'Ví MoMo' },
                    { key: 'paypal', label: 'PayPal' },
                  ].map((m) => {
                    const active = payoutMethod === m.key;
                    return (
                      <Pressable
                        key={m.key}
                        disabled={payoutLoading}
                        onPress={() => setPayoutMethod(m.key as any)}
                        style={[styles.paymentMethodChip, active && styles.paymentMethodChipActive]}
                      >
                        <ThemedText style={[styles.paymentMethodLabel, active && { color: '#0a051d' }]}>
                          {m.label}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Amount input */}
                <View style={styles.amountInputGroup}>
                  <ThemedText style={styles.inputGroupLabel}>Số tiền cần rút (đ):</ThemedText>
                  <View style={styles.currencyInputRow}>
                    <TextInput
                      style={styles.payoutTextInput}
                      value={payoutAmount}
                      onChangeText={setPayoutAmount}
                      keyboardType="numeric"
                      editable={!payoutLoading}
                      placeholder="Nhập số tiền..."
                      placeholderTextColor="#64748b"
                    />
                    <ThemedText style={styles.payoutCurrencyLabel}>đ</ThemedText>
                  </View>
                </View>

                {/* Suggestions chips */}
                <View style={styles.suggestionAmountChips}>
                  {[200000, 500000, 1000000, 2000000].map((amt) => (
                    <Pressable
                      key={amt}
                      disabled={payoutLoading || amt > totalEarnings}
                      onPress={() => setPayoutAmount(amt.toString())}
                      style={[
                        styles.suggestionAmountChip,
                        amt > totalEarnings && { opacity: 0.4 },
                      ]}
                    >
                      <ThemedText style={styles.suggestionAmountText}>
                        {(amt / 1000).toString()}k
                      </ThemedText>
                    </Pressable>
                  ))}
                  <Pressable
                    disabled={payoutLoading}
                    onPress={() => setPayoutAmount(totalEarnings.toString())}
                    style={styles.suggestionAmountChip}
                  >
                    <ThemedText style={styles.suggestionAmountText}>Tất cả</ThemedText>
                  </Pressable>
                </View>

                {/* Account Details */}
                <View style={styles.amountInputGroup}>
                  <ThemedText style={styles.inputGroupLabel}>
                    {payoutMethod === 'bank'
                      ? 'Số tài khoản & Tên ngân hàng:'
                      : payoutMethod === 'momo'
                      ? 'Số điện thoại đăng ký MoMo:'
                      : 'Địa chỉ Email PayPal:'}
                  </ThemedText>
                  <TextInput
                    style={styles.accountTextInput}
                    placeholder={
                      payoutMethod === 'bank'
                        ? '1903... - Techcombank'
                        : payoutMethod === 'momo'
                        ? '09xx xxx xxx'
                        : 'your-email@paypal.com'
                    }
                    placeholderTextColor="#64748b"
                    editable={!payoutLoading}
                  />
                </View>

                {/* Warnings or balances */}
                <View style={styles.balanceInfoRow}>
                  <ThemedText style={styles.balanceInfoText}>
                    Số dư khả dụng: {totalEarnings.toLocaleString()} đ
                  </ThemedText>
                  {Number(payoutAmount) > totalEarnings && (
                    <ThemedText style={styles.insufficientText}>Không đủ số dư</ThemedText>
                  )}
                </View>

                {/* Withdraw CTA */}
                <Pressable
                  disabled={
                    payoutLoading ||
                    Number(payoutAmount) <= 0 ||
                    Number(payoutAmount) > totalEarnings
                  }
                  onPress={handleWithdraw}
                  style={[
                    styles.confirmWithdrawBtn,
                    (payoutLoading ||
                      Number(payoutAmount) <= 0 ||
                      Number(payoutAmount) > totalEarnings) &&
                      styles.confirmWithdrawBtnDisabled,
                  ]}
                >
                  <ThemedText style={styles.confirmWithdrawText}>
                    {payoutLoading ? 'Đang giao dịch...' : 'Xác Nhận Rút Tiền'}
                  </ThemedText>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safeArea: { flex: 1 },
  content: { maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center', paddingHorizontal: Spacing.three, gap: Spacing.four },
  heroCard: { borderRadius: 24, padding: Spacing.three, backgroundColor: 'rgba(22,17,41,0.7)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  heroTop: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  topBadgeText: { color: '#fb7185', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  heroTitle: { color: '#fff', fontSize: 24, fontWeight: '900', marginTop: 4 },
  heroDesc: { color: '#cbd5e1', fontSize: 12, lineHeight: 18, marginTop: 8 },
  heroIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#fb7185', alignItems: 'center', justifyContent: 'center' },
  roleStrip: { flexDirection: 'row', gap: 8 },
  roleCard: { flex: 1, borderRadius: 18, padding: 10, gap: 6, backgroundColor: 'rgba(22,17,41,0.4)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  roleIconWrap: { width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  roleTitle: { color: '#94a3b8', fontWeight: '800', fontSize: 12 },
  roleDescText: { fontSize: 10, color: '#64748b', lineHeight: 14 },
  workspaceGrid: { gap: 12 },
  toolCard: { borderRadius: 20, padding: 12, backgroundColor: 'rgba(22,17,41,0.6)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', gap: 10 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { color: '#f8fafc', fontSize: 11, letterSpacing: 1, fontWeight: '800' },
  zoomPillText: { color: '#a5b4fc', fontSize: 11, fontWeight: '700' },
  modeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  toolChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  toolChipActive: { backgroundColor: '#fff' },
  toolChipText: { color: '#cbd5e1', fontSize: 11, fontWeight: '700' },
  canvasActionsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  zoomGroup: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  zoomBtn: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)' },
  zoomResetBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.06)' },
  zoomResetText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  clearBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' },
  clearBtnText: { color: '#ef4444', fontSize: 11, fontWeight: '800' },
  canvasContainerCard: { borderRadius: 20, padding: 12, backgroundColor: 'rgba(22,17,41,0.6)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', gap: 10 },
  greenPill: { borderRadius: 999, backgroundColor: 'rgba(34,197,94,0.1)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)', paddingHorizontal: 8, paddingVertical: 4 },
  greenPillText: { color: '#22c55e', fontSize: 10, fontWeight: '800' },
  canvasViewport: { width: 340, height: 380, alignSelf: 'center', backgroundColor: '#161129', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  canvasBg: { width: '100%', height: '100%', position: 'relative' },
  zoneBox: { position: 'absolute', borderWidth: 1.5, borderStyle: 'solid' },
  zoneBoxLabel: { position: 'absolute', top: 0, left: 0, paddingHorizontal: 6, paddingVertical: 2 },
  zoneBoxLabelText: { color: '#fff', fontSize: 8, fontWeight: '900' },
  resizeAnchorGrip: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#fb7185', position: 'absolute', borderWidth: 1.5, borderColor: '#fff' },
  dragDashedBox: { position: 'absolute', borderWidth: 1.5, borderColor: '#fb7185', borderStyle: 'dashed', backgroundColor: 'rgba(251,113,133,0.12)' },
  paintDot: { position: 'absolute', width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#ef4444' },
  textOverlayBox: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.85)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.3)' },
  textOverlayContent: { color: '#fff', fontSize: 10, fontWeight: '900' },
  canvasTip: { color: '#64748b', fontSize: 11, textAlign: 'center', fontStyle: 'italic' },
  zonesCard: { borderRadius: 20, padding: 12, backgroundColor: 'rgba(22,17,41,0.6)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', gap: 10 },
  zoneCountText: { color: '#a5b4fc', fontSize: 11, fontWeight: '700' },
  zonesChecklist: { gap: 8 },
  zoneCheckItem: { borderRadius: 12, padding: 10, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  zoneCheckItemActive: { borderColor: 'rgba(255,255,255,0.15)', backgroundColor: 'rgba(255,255,255,0.05)' },
  zoneCheckLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyeToggleBtn: { padding: 4 },
  smallColorDot: { width: 8, height: 8, borderRadius: 4 },
  zoneNameText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  zoneCoordText: { color: '#64748b', fontSize: 10, marginLeft: 28 },
  activeZoneProps: { marginTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', paddingTop: 8, gap: 6 },
  propLabel: { color: '#a5b4fc', fontSize: 11, fontWeight: '700' },
  propGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  propChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.08)' },
  propChipText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  deleteZoneBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, alignSelf: 'flex-start' },
  deleteZoneText: { color: '#ef4444', fontSize: 10, fontWeight: '800' },
  bottomPageSlider: { borderRadius: 20, padding: 12, backgroundColor: 'rgba(22,17,41,0.6)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', gap: 10 },
  pageAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: '#fb7185' },
  pageAddText: { color: '#0a051d', fontSize: 10, fontWeight: '800' },
  pagesScroll: { gap: 10 },
  pageThumbFrame: { width: 56, height: 68, borderRadius: 10, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent', position: 'relative' },
  pageThumbFrameActive: { borderColor: '#fb7185' },
  pageThumbImage: { width: '100%', height: '100%', opacity: 0.6 },
  pageThumbNumWrap: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingVertical: 2, backgroundColor: 'rgba(0,0,0,0.65)' },
  pageThumbNumText: { color: '#fff', fontSize: 8, fontWeight: '700', textAlign: 'center' },
  uploaderWorkspace: { borderRadius: 20, padding: 12, backgroundColor: 'rgba(22,17,41,0.6)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', gap: 12 },
  uploaderBox: { borderRadius: 16, padding: 20, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)', borderStyle: 'dashed', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.02)' },
  uploaderBoxTitle: { color: '#fff', fontSize: 14, fontWeight: '800' },
  uploaderBoxSub: { color: '#64748b', fontSize: 11 },
  uploadCtaBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  uploadCtaText: { color: '#0a051d', fontSize: 12, fontWeight: '800' },
  pagesGridWrap: { gap: 8 },
  gridHeading: { color: '#fff', fontSize: 12, fontWeight: '800' },
  pagesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pageGridCard: { width: '30%', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  pageGridThumb: { width: '100%', height: 100 },
  pageGridMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 6, backgroundColor: 'rgba(0,0,0,0.85)' },
  pageGridNumText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  pageGridTrash: { padding: 4 },
  managerWorkspace: { borderRadius: 20, padding: 12, backgroundColor: 'rgba(22,17,41,0.6)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', gap: 12 },
  kanbanContainer: { flexDirection: 'row', gap: 8 },
  kanbanColumn: { width: 154, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', padding: 8, height: 260 },
  kanbanColHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)', paddingBottom: 6, marginBottom: 8 },
  colTitleText: { color: '#fff', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  colCountBadge: { width: 16, height: 16, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  colCountText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  kanbanCardScroll: { flex: 1 },
  kanbanCard: { borderRadius: 10, padding: 8, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.06)', marginBottom: 8, gap: 4 },
  kanbanCardTitle: { color: '#fff', fontSize: 11, fontWeight: '800' },
  kanbanCardNote: { color: '#64748b', fontSize: 9, lineHeight: 12 },
  kanbanCardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  kanbanRoleBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.06)' },
  kanbanRoleText: { color: '#a5b4fc', fontSize: 8, fontWeight: '700' },
  taskNavActions: { flexDirection: 'row', gap: 4 },
  taskNextBtn: { width: 16, height: 16, borderRadius: 4, backgroundColor: '#fb7185', alignItems: 'center', justifyContent: 'center' },
  
  // Assistant Roles Styles
  assistantWorkspace: { gap: 14 },
  statsGridRow: { flexDirection: 'row', gap: 8 },
  statBoxCard: { flex: 1, borderRadius: 16, padding: 10, backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', flexDirection: 'row', alignItems: 'center', gap: 8 },
  statIconCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  statBoxLabel: { color: '#64748b', fontSize: 9, fontWeight: '700' },
  statBoxVal: { color: '#fff', fontSize: 14, fontWeight: '900', marginTop: 2 },
  earningsCard: { borderRadius: 20, padding: 14, gap: 14 },
  earningsTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  earningsInfoCol: { gap: 4 },
  walletHeadingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  earningsLabelText: { color: '#fecdd3', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  earningsValueText: { color: '#fff', fontSize: 24, fontWeight: '900' },
  payoutCtaBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  payoutCtaText: { color: '#e11d48', fontSize: 11, fontWeight: '900' },
  chartContainer: { backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 14, padding: 10, gap: 8 },
  chartHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chartHeaderText: { color: '#fecdd3', fontSize: 9, fontWeight: '700' },
  barsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 75, paddingTop: 10 },
  barCol: { alignItems: 'center', width: 28 },
  barTrack: { height: 50, width: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill: { width: '100%', backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 4 },
  barLabel: { color: '#fecdd3', fontSize: 8, marginTop: 4, fontWeight: '700' },
  filterChipRow: { gap: 6, paddingVertical: 2 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  filterChipActive: { backgroundColor: '#f43f5e', borderColor: '#f43f5e' },
  filterChipText: { color: '#94a3b8', fontSize: 11, fontWeight: '800' },
  filterChipTextActive: { color: '#fff' },
  freelanceTasksContainer: { gap: 10 },
  freelanceTaskCard: { borderRadius: 20, padding: 14, backgroundColor: 'rgba(22,17,41,0.6)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', gap: 10 },
  taskCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  taskCardTitle: { color: '#fff', fontSize: 13, fontWeight: '900', marginTop: 4 },
  badgeCol: { alignItems: 'flex-end', justifyContent: 'flex-start' },
  seriesTagRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  seriesTagText: { color: '#f43f5e', fontSize: 9, fontWeight: '800' },
  statusIndicatorBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  statusBadgeText: { fontSize: 9, fontWeight: '800' },
  taskCardDesc: { color: '#94a3b8', fontSize: 11, lineHeight: 16 },
  taskCardMetaRow: { flexDirection: 'row', gap: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', paddingTop: 10 },
  metaCol: { gap: 2 },
  metaLabel: { color: '#64748b', fontSize: 9, fontWeight: '700' },
  metaValueReward: { color: '#f43f5e', fontSize: 12, fontWeight: '800' },
  metaValueDeadline: { color: '#cbd5e1', fontSize: 11, fontWeight: '800' },
  taskActionsWrap: { marginTop: 4 },
  taskAcceptBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#f43f5e', paddingVertical: 10, borderRadius: 10 },
  taskAcceptBtnText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  progressUploadContainer: { gap: 6 },
  progressInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLoadingText: { color: '#f43f5e', fontSize: 11, fontWeight: '700' },
  progressPercentText: { color: '#f43f5e', fontSize: 11, fontWeight: '900' },
  progressBarTrack: { height: 6, width: '100%', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#f43f5e', borderRadius: 3 },
  taskSubmitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#f43f5e', paddingVertical: 10, borderRadius: 10 },
  taskSubmitBtnText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  reviewPendingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(139,92,246,0.08)', borderWidth: 1, borderColor: 'rgba(139,92,246,0.12)', padding: 10, borderRadius: 10 },
  reviewPendingText: { color: '#a78bfa', fontSize: 10, fontWeight: '800', flex: 1, lineHeight: 14 },
  taskCompletedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(34,197,94,0.08)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.12)', padding: 10, borderRadius: 10 },
  taskCompletedText: { color: '#4ade80', fontSize: 10, fontWeight: '800', flex: 1, lineHeight: 14 },
  
  // Payout Dialog Modal styles
  payoutOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end', zIndex: 1000 },
  payoutDismissHotspot: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  payoutSheetContainer: { backgroundColor: '#0e0921', borderTopLeftRadius: 30, borderTopRightRadius: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 20 },
  payoutFormContainer: { gap: 16 },
  payoutFormHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)', paddingBottom: 10 },
  payoutFormTitle: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  payoutCloseBtn: { padding: 4 },
  paymentMethodsRow: { flexDirection: 'row', gap: 8 },
  paymentMethodChip: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', alignItems: 'center' },
  paymentMethodChipActive: { backgroundColor: '#fff', borderColor: '#fff' },
  paymentMethodLabel: { color: '#94a3b8', fontSize: 11, fontWeight: '800' },
  amountInputGroup: { gap: 6 },
  inputGroupLabel: { color: '#cbd5e1', fontSize: 11, fontWeight: '700' },
  currencyInputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 12, paddingHorizontal: 12 },
  payoutTextInput: { flex: 1, color: '#fff', fontSize: 16, fontWeight: '800', height: 48 },
  payoutCurrencyLabel: { color: '#64748b', fontSize: 14, fontWeight: '800' },
  suggestionAmountChips: { flexDirection: 'row', gap: 6 },
  suggestionAmountChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)' },
  suggestionAmountText: { color: '#cbd5e1', fontSize: 10, fontWeight: '800' },
  accountTextInput: { backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 12, paddingHorizontal: 12, color: '#fff', fontSize: 13, fontWeight: '700', height: 44 },
  balanceInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  balanceInfoText: { color: '#64748b', fontSize: 10, fontWeight: '700' },
  insufficientText: { color: '#ef4444', fontSize: 10, fontWeight: '800' },
  confirmWithdrawBtn: { backgroundColor: '#f43f5e', paddingVertical: 12, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  confirmWithdrawBtnDisabled: { backgroundColor: 'rgba(244,63,94,0.3)', opacity: 0.6 },
  confirmWithdrawText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  successContainer: { alignItems: 'center', paddingVertical: 20, gap: 12 },
  successTickWrapper: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(34,197,94,0.1)', borderWidth: 1.5, borderColor: 'rgba(34,197,94,0.3)', alignItems: 'center', justifyContent: 'center' },
  successTitleText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  successAmountText: { color: '#22c55e', fontSize: 24, fontWeight: '900' },
  successSubText: { color: '#94a3b8', fontSize: 11, textAlign: 'center', lineHeight: 16 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244,63,94,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(244,63,94,0.3)',
    borderRadius: 16,
    padding: 12,
    marginTop: 10,
    gap: 10,
  },
  errorBannerText: {
    flex: 1,
    color: '#fb7185',
    fontSize: 12,
    fontWeight: '700',
  },
  retryBtn: {
    backgroundColor: '#fb7185',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
});
