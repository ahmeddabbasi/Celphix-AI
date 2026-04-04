import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, UserPlus, Key, Activity, TrendingUp, Users, Phone, Clock, AlertCircle, Trash2, KeyRound, Volume2, Eye, EyeOff, Pencil, Play, Square } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AdminPortalSkeletons } from "@/components/ui/skeletons";
import { Switch } from "@/components/ui/switch";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import { getErrorMessage } from "@/lib/errors";
import { 
  useAdminUsers, 
  useAdminActivityStreamSimple, 
  useCreateUser, 
  useUpdateUserQuota, 
  useAddCredential,
  useDeleteUser,
  useRevokeUserCCAccess,
  useKeyPool,
  useAddPoolKey,
  useRemovePoolKey,
} from "@/hooks/use-admin-queries";
import {
  useAdminVoices,
  useUpdateVoice,
  useToggleVoiceVisibility,
  type VoiceEntry,
} from "@/hooks/use-voice-queries";

interface UserWithStats {
  id: number;
  username: string;
  display_name: string;
  role: string;
  is_admin: boolean;
  max_assistants: number;
  max_concurrent_sessions: number;
  created_at: string;
  command_center_access: boolean;
  cc_request_status: "pending" | "approved" | "rejected" | "revoked" | null;
  assistant_count: number;
  assistant_limit: number;
  active_calls: number;
  total_call_duration: number;
  last_login: string | null;
}

export default function SuperAdminPortal() {
  // React Query hooks with optimized SWR caching
  const { data: users = [], isLoading: usersLoading, error: usersError } = useAdminUsers();
  const { data: activityData, isLoading: activityLoading } = useAdminActivityStreamSimple({ limit: 50 });
  const createUserMutation = useCreateUser();
  const updateQuotaMutation = useUpdateUserQuota();
  const addCredentialMutation = useAddCredential();
  const { data: keyPoolData, isLoading: keyPoolLoading } = useKeyPool();
  const addPoolKeyMutation = useAddPoolKey();
  const removePoolKeyMutation = useRemovePoolKey();
  const deleteUserMutation = useDeleteUser();
  const revokeUserCCAccessMutation = useRevokeUserCCAccess();

  // Voice management
  const { data: adminVoices = [], isLoading: voicesLoading } = useAdminVoices();
  const updateVoiceMutation = useUpdateVoice();
  const toggleVisibilityMutation = useToggleVoiceVisibility();
  const { play: playAudio, stop: stopAudio, isPlaying: isAudioPlaying, isPlayingUrl } = useAudioPlayer();
  
  const [createUserDialogOpen, setCreateUserDialogOpen] = useState(false);
  const [addCredentialDialogOpen, setAddCredentialDialogOpen] = useState(false);
  const [updateQuotaDialogOpen, setUpdateQuotaDialogOpen] = useState(false);
  const [addPoolKeyDialogOpen, setAddPoolKeyDialogOpen] = useState(false);
  const [deleteUserDialogOpen, setDeleteUserDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserWithStats | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserWithStats | null>(null);
  const [editVoiceDialogOpen, setEditVoiceDialogOpen] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<VoiceEntry | null>(null);
  const [voiceForm, setVoiceForm] = useState({ display_name: "", gender: "", accent: "" });
  const [voiceSearch, setVoiceSearch] = useState("");
  const { toast } = useToast();

  // Form states
  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    display_name: "",
    role: "agent",
    is_admin: false,
    max_assistants: 10,
    max_concurrent_sessions: 10,
  });

  const [newCredential, setNewCredential] = useState({
    user_id: 0,
    provider: "openai" as "openai" | "deepgram",
    api_key: "",
  });

  const [newQuota, setNewQuota] = useState(10);
  const [newConcurrentSessions, setNewConcurrentSessions] = useState(10);

  const [newPoolKey, setNewPoolKey] = useState({
    provider: "openai" as "openai" | "deepgram",
    api_key: "",
    name: "",
  });
  
  const activities = activityData?.events || [];

  const handleCreateUser = async () => {
    try {
      await createUserMutation.mutateAsync(newUser);
      toast({
        title: "Success",
        description: `User ${newUser.username} created successfully`,
      });
      setCreateUserDialogOpen(false);
      setNewUser({
        username: "",
        password: "",
        display_name: "",
        role: "agent",
        is_admin: false,
        max_assistants: 10,
        max_concurrent_sessions: 10,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to create user"),
        variant: "destructive",
      });
    }
  };

  const handleAddCredential = async () => {
    try {
      await addCredentialMutation.mutateAsync(newCredential);
      toast({
        title: "Success",
        description: "API credential added successfully",
      });
      setAddCredentialDialogOpen(false);
      setNewCredential({ user_id: 0, provider: "openai", api_key: "" });
    } catch (error) {
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to add credential"),
        variant: "destructive",
      });
    }
  };

  const handleUpdateQuota = async (userId: number) => {
    try {
      await updateQuotaMutation.mutateAsync({ userId, maxAssistants: newQuota, maxConcurrentSessions: newConcurrentSessions });
      toast({
        title: "Success",
        description: "User quota updated successfully",
      });
      setUpdateQuotaDialogOpen(false);
      setSelectedUser(null);
    } catch (error) {
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to update quota"),
        variant: "destructive",
      });
    }
  };

  const handleAddPoolKey = async () => {
    try {
      await addPoolKeyMutation.mutateAsync({
        provider: newPoolKey.provider,
        api_key: newPoolKey.api_key,
        name: newPoolKey.name || undefined,
      });
      toast({ title: "Success", description: "Key added to global pool" });
      setAddPoolKeyDialogOpen(false);
      setNewPoolKey({ provider: "openai", api_key: "", name: "" });
    } catch (error) {
      toast({ title: "Error", description: getErrorMessage(error, "Failed to add key"), variant: "destructive" });
    }
  };

  const handleRemovePoolKey = async (provider: string, id: number) => {
    try {
      await removePoolKeyMutation.mutateAsync({ provider, id });
      toast({ title: "Success", description: "Key removed from global pool" });
    } catch (error) {
      toast({ title: "Error", description: getErrorMessage(error, "Failed to remove key"), variant: "destructive" });
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      await deleteUserMutation.mutateAsync(userToDelete.id);
      toast({
        title: "User Deleted",
        description: `${userToDelete.display_name} (@${userToDelete.username}) has been permanently deleted`,
      });
      setDeleteUserDialogOpen(false);
      setUserToDelete(null);
    } catch (error) {
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to delete user"),
        variant: "destructive",
      });
    }
  };

  const handleRevokeCC = async (user: UserWithStats) => {
    try {
      await revokeUserCCAccessMutation.mutateAsync(user.id);
      toast({
        title: "CC Access Revoked",
        description: `Command Center access removed for @${user.username}. They have been notified.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to revoke CC access"),
        variant: "destructive",
      });
    }
  };

  const handleToggleVoiceVisibility = async (voiceId: number) => {
    try {
      const result = await toggleVisibilityMutation.mutateAsync(voiceId);
      const action = result.visible ? "shown" : "hidden";
      toast({ title: "Success", description: `Voice "${result.display_name}" is now ${action}` });
    } catch (error) {
      toast({ title: "Error", description: getErrorMessage(error, "Failed to toggle visibility"), variant: "destructive" });
    }
  };

  const handleUpdateVoice = async () => {
    if (!selectedVoice) return;
    try {
      const changes: Record<string, string> = {};
      if (voiceForm.display_name && voiceForm.display_name !== selectedVoice.display_name) changes.display_name = voiceForm.display_name;
      if (voiceForm.gender && voiceForm.gender !== selectedVoice.gender) changes.gender = voiceForm.gender;
      if (voiceForm.accent && voiceForm.accent !== selectedVoice.accent) changes.accent = voiceForm.accent;

      if (Object.keys(changes).length === 0) {
        setEditVoiceDialogOpen(false);
        return;
      }

      await updateVoiceMutation.mutateAsync({ voiceId: selectedVoice.id, ...changes });
      toast({ title: "Success", description: `Voice "${voiceForm.display_name}" updated successfully` });
      setEditVoiceDialogOpen(false);
      setSelectedVoice(null);
    } catch (error) {
      toast({ title: "Error", description: getErrorMessage(error, "Failed to update voice"), variant: "destructive" });
    }
  };

  const filteredVoices = adminVoices.filter((v) => {
    if (!voiceSearch.trim()) return true;
    const q = voiceSearch.trim().toLowerCase();
    return v.display_name.toLowerCase().includes(q) ||
           v.speaker_id.toLowerCase().includes(q) ||
           v.accent.toLowerCase().includes(q) ||
           v.gender.toLowerCase().includes(q);
  });

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const getSeverityColor = (severity: string): BadgeProps["variant"] => {
    switch (severity) {
      case "error":
        return "destructive";
      case "warning":
        return "default";
      case "info":
        return "secondary";
      default:
        return "outline";
    }
  };

  // Show skeleton while loading (appears instantly, <16ms)
  if (usersLoading || activityLoading) {
    return <AdminPortalSkeletons />;
  }

  // Error state
  if (usersError) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-6 w-6 text-destructive" />
              <CardTitle>Access Denied</CardTitle>
            </div>
            <CardDescription>
              Failed to load admin portal. Ensure you're logged in with admin privileges.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Calculate stats
  const totalUsers = users.length;
  const totalAssistants = users.reduce((sum: number, u) => sum + u.assistant_count, 0);
  const totalActiveCalls = users.reduce((sum: number, u) => sum + u.active_calls, 0);
  const totalCallDuration = users.reduce((sum: number, u) => sum + u.total_call_duration, 0);

  return (
    <div className="space-y-[clamp(1.25rem,2.4vw,2.25rem)]">
      {/* Header */}
      <div data-reveal className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-h1 text-foreground flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            Super Admin Control Plane
          </h1>
        </div>
        <div className="flex gap-2">
          <Dialog open={createUserDialogOpen} onOpenChange={setCreateUserDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="h-4 w-4" />
                Create User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
                <DialogDescription>
                  Manually provision a new user account with quota limits
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={newUser.username}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewUser({ ...newUser, username: e.target.value })}
                    placeholder=""
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newUser.password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder=""
                  />
                </div>
                <div>
                  <Label htmlFor="display_name">Display Name</Label>
                  <Input
                    id="display_name"
                    value={newUser.display_name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewUser({ ...newUser, display_name: e.target.value })}
                    placeholder=""
                  />
                </div>
                <div>
                  <Label htmlFor="max_assistants">Assistant Quota</Label>
                  <Input
                    id="max_assistants"
                    type="number"
                    value={newUser.max_assistants}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewUser({ ...newUser, max_assistants: parseInt(e.target.value) || 10 })}
                  />
                </div>
                <div>
                  <Label htmlFor="max_concurrent_sessions">Max Concurrent Sessions (WS)</Label>
                  <Input
                    id="max_concurrent_sessions"
                    type="number"
                    value={newUser.max_concurrent_sessions}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewUser({ ...newUser, max_concurrent_sessions: parseInt(e.target.value) || 10 })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Maximum simultaneous active calls 
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_admin"
                    checked={newUser.is_admin}
                    onChange={(e) => setNewUser({ ...newUser, is_admin: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="is_admin" className="cursor-pointer">
                    Grant Admin Privileges
                  </Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateUserDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateUser} disabled={createUserMutation.isPending}>
                  {createUserMutation.isPending ? "Creating..." : "Create User"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={addCredentialDialogOpen} onOpenChange={setAddCredentialDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Key className="h-4 w-4" />
                Add Credential
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Managed API Credential</DialogTitle>
                <DialogDescription>
                  Securely add OpenAI or Deepgram keys for a user
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="cred_user">User</Label>
                  <Select
                    value={newCredential.user_id.toString()}
                    onValueChange={(value: string) => setNewCredential({ ...newCredential, user_id: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          {user.display_name} (@{user.username})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="provider">Provider</Label>
                  <Select
                    value={newCredential.provider}
                    onValueChange={(value: string) => setNewCredential({ ...newCredential, provider: value as "openai" | "deepgram" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="deepgram">Deepgram</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="api_key">API Key</Label>
                  <Input
                    id="api_key"
                    type="password"
                    value={newCredential.api_key}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCredential({ ...newCredential, api_key: e.target.value })}
                    placeholder=""
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddCredentialDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddCredential} disabled={addCredentialMutation.isPending}>
                  {addCredentialMutation.isPending ? "Adding" : "Add Credential"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground">Active accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assistants</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAssistants}</div>
            <p className="text-xs text-muted-foreground">Assistants across all tenants</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Calls</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalActiveCalls}</div>
            <p className="text-xs text-muted-foreground">Ongoing conversations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Call Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(totalCallDuration)}</div>
            <p className="text-xs text-muted-foreground">duration</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="users">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="voices" className="gap-2">
            <Volume2 className="h-4 w-4" />
            Voices
          </TabsTrigger>
          <TabsTrigger value="key-pool" className="gap-2">
            <KeyRound className="h-4 w-4" />
            Key Pool
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-2">
            <Activity className="h-4 w-4" />
            Activity
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                All Users
              </CardTitle>
              <CardDescription>
                Comprehensive user statistics with assistant quotas and activity.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Service Access</TableHead>
                    <TableHead>Assistants</TableHead>
                    <TableHead>Active Calls</TableHead>
                    <TableHead>Total Duration</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{user.display_name}</div>
                          <div className="text-sm text-muted-foreground">@{user.username}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.is_admin ? (
                          <Badge variant="default">Admin</Badge>
                        ) : (
                          <Badge variant="outline">{user.role}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.is_admin ? (
                          <div className="flex flex-col gap-1">
                            <Badge variant="secondary" className="w-fit text-[10px]">Pay-As-You-Go</Badge>
                            <Badge variant="default" className="w-fit text-[10px]">Command Center</Badge>
                          </div>
                        ) : user.command_center_access ? (
                          <div className="flex flex-col gap-1">
                            <Badge variant="secondary" className="w-fit text-[10px]">Pay-As-You-Go</Badge>
                            <Badge variant="default" className="w-fit text-[10px] bg-primary hover:bg-primary">Command Center</Badge>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <Badge variant="secondary" className="w-fit text-[10px]">Pay-As-You-Go</Badge>
                            {user.cc_request_status === "pending" && (
                              <Badge variant="outline" className="w-fit text-[10px] border-accent/40 text-accent-foreground">CC Pending</Badge>
                            )}
                            {user.cc_request_status === "rejected" && (
                              <Badge variant="outline" className="w-fit text-[10px] border-red-500/40 text-red-600">CC Rejected</Badge>
                            )}
                            {user.cc_request_status === "revoked" && (
                              <Badge variant="outline" className="w-fit text-[10px] border-red-600/60 text-red-700 bg-red-50">CC Revoked</Badge>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono">
                            {user.assistant_count}/{user.max_assistants}
                          </span>
                          {user.assistant_count >= user.max_assistants && (
                            <Badge variant="destructive" className="text-xs">LIMIT</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{user.active_calls}</TableCell>
                      <TableCell>{formatDuration(user.total_call_duration)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {user.last_login
                          ? new Date(user.last_login).toLocaleDateString()
                          : "Never"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user);
                              setNewQuota(user.max_assistants);
                              setNewConcurrentSessions(user.max_concurrent_sessions ?? 10);
                              setUpdateQuotaDialogOpen(true);
                            }}
                          >
                            Edit Quota
                          </Button>
                          {!user.is_admin && user.command_center_access && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-primary hover:text-primary hover:bg-primary/10"
                              disabled={revokeUserCCAccessMutation.isPending}
                              title={`Revoke Command Center access for ${user.username}`}
                              onClick={() => handleRevokeCC(user)}
                            >
                              Revoke CC
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            disabled={user.is_admin}
                            title={user.is_admin ? "Cannot delete admin users" : `Delete ${user.username}`}
                            onClick={() => {
                              setUserToDelete(user);
                              setDeleteUserDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Voices Tab */}
        <TabsContent value="voices">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Volume2 className="h-5 w-5" />
                Voice Settings
              </CardTitle>
              <CardDescription>
                Manage Voices
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Search + Stop playback */}
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <Input
                  placeholder="Search voices by name, ID, accent…"
                  value={voiceSearch}
                  onChange={(e) => setVoiceSearch(e.target.value)}
                  className="max-w-sm"
                />
                {isAudioPlaying && (
                  <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={stopAudio}>
                    <Volume2 className="h-3.5 w-3.5 animate-pulse text-primary" />
                    Stop Playback
                  </Button>
                )}
              </div>

              {voicesLoading ? (
                <p className="text-sm text-muted-foreground">Loading voices…</p>
              ) : (
                <div className="border rounded-lg max-h-[600px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[80px]">ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Gender</TableHead>
                        <TableHead>Accent</TableHead>
                        <TableHead className="w-[80px] text-center">Sample</TableHead>
                        <TableHead className="w-[100px] text-center">Visible</TableHead>
                        <TableHead className="w-[80px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredVoices.map((voice) => (
                        <TableRow key={voice.id} className={!voice.visible ? "opacity-50" : ""}>
                          <TableCell className="font-mono text-xs text-muted-foreground">{voice.speaker_id}</TableCell>
                          <TableCell className="font-medium">{voice.display_name}</TableCell>
                          <TableCell>
                            <Badge variant={voice.gender === "Female" ? "secondary" : "outline"}>
                              {voice.gender}
                            </Badge>
                          </TableCell>
                          <TableCell>{voice.accent}</TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant={isPlayingUrl(voice.sample_url) ? "default" : "ghost"}
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => playAudio(voice.sample_url)}
                              title={isPlayingUrl(voice.sample_url) ? "Stop" : "Play sample"}
                            >
                              {isPlayingUrl(voice.sample_url) ? (
                                <Square className="h-3.5 w-3.5" />
                              ) : (
                                <Play className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={voice.visible}
                              onCheckedChange={() => handleToggleVoiceVisibility(voice.id)}
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedVoice(voice);
                                setVoiceForm({
                                  display_name: voice.display_name,
                                  gender: voice.gender,
                                  accent: voice.accent,
                                });
                                setEditVoiceDialogOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              <p className="text-xs text-muted-foreground mt-3">
                {filteredVoices.length} of {adminVoices.length} voices shown •
                {adminVoices.filter((v) => v.visible).length} visible to users
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Key Pool Tab */}
        <TabsContent value="key-pool">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <KeyRound className="h-5 w-5" />
                  Global Key Pool
                </CardTitle>
                <CardDescription>
                  Shared OpenAI &amp; Deepgram API keys used by all users.
                </CardDescription>
              </div>
              <Dialog open={addPoolKeyDialogOpen} onOpenChange={setAddPoolKeyDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Key className="h-4 w-4" />
                    Add Key
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Global API Key</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label>Provider</Label>
                      <Select
                        value={newPoolKey.provider}
                        onValueChange={(value: string) =>
                          setNewPoolKey({ ...newPoolKey, provider: value as "openai" | "deepgram" })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="openai">OpenAI</SelectItem>
                          <SelectItem value="deepgram">Deepgram</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="pool_key">API Key</Label>
                      <Input
                        id="pool_key"
                        type="password"
                        value={newPoolKey.api_key}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setNewPoolKey({ ...newPoolKey, api_key: e.target.value })
                        }
                        placeholder=""
                      />
                    </div>
                    <div>
                      <Label htmlFor="pool_key_name">Label (optional)</Label>
                      <Input
                        id="pool_key_name"
                        value={newPoolKey.name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setNewPoolKey({ ...newPoolKey, name: e.target.value })
                        }
                        placeholder="Production key 1"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setAddPoolKeyDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddPoolKey} disabled={addPoolKeyMutation.isPending}>
                      {addPoolKeyMutation.isPending ? "Adding..." : "Add Key"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {keyPoolLoading ? (
                <p className="text-sm text-muted-foreground">Loading keys…</p>
              ) : (
                <div className="space-y-6">
                  {(["openai", "deepgram"] as const).map((provider) => {
                    const keys = keyPoolData?.providers?.[provider] ?? [];
                    return (
                      <div key={provider}>
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                          {provider === "openai" ? "OpenAI" : "Deepgram"} — {keys.length} key{keys.length !== 1 ? "s" : ""}
                        </h3>
                        {keys.length === 0 ? (
                          <p className="text-sm text-muted-foreground italic">No keys configured</p>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>Label</TableHead>
                                <TableHead>Key Preview</TableHead>
                                <TableHead>Added</TableHead>
                                <TableHead>Remove</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {keys.map((key) => (
                                <TableRow key={key.id}>
                                  <TableCell className="font-mono text-xs">{key.id}</TableCell>
                                  <TableCell>{key.name ?? <span className="text-muted-foreground italic">—</span>}</TableCell>
                                  <TableCell className="font-mono text-xs text-muted-foreground">{key.key_preview ?? "—"}</TableCell>
                                  <TableCell className="text-sm text-muted-foreground">
                                    {key.created_at
                                      ? new Date(key.created_at).toLocaleDateString()
                                      : "—"}
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-destructive hover:text-destructive"
                                      disabled={removePoolKeyMutation.isPending}
                                      onClick={() => handleRemovePoolKey(provider, key.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Global Activity Stream
              </CardTitle>
              <CardDescription>
                Real-time events across all users.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {activities.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <Badge variant={getSeverityColor(event.severity)} className="mt-0.5">
                      {event.severity}
                    </Badge>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{event.description}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        User: {event.display_name} (@{event.username})
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Update Quota Dialog */}
      <Dialog open={updateQuotaDialogOpen} onOpenChange={setUpdateQuotaDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update User Limits</DialogTitle>
            <DialogDescription>
              Modify assistant quota and concurrent session limit for {selectedUser?.display_name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="new_quota">Assistant Quota</Label>
              <Input
                id="new_quota"
                type="number"
                value={newQuota}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewQuota(parseInt(e.target.value) || 0)}
                min="0"
                max="1000"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Current: {selectedUser?.assistant_count}/{selectedUser?.max_assistants}
              </p>
            </div>
            <div>
              <Label htmlFor="new_concurrent">Max Concurrent Sessions (WS)</Label>
              <Input
                id="new_concurrent"
                type="number"
                value={newConcurrentSessions}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewConcurrentSessions(parseInt(e.target.value) || 1)}
                min="1"
                max="500"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Maximum simultaneous active calls. Current limit: {selectedUser?.max_concurrent_sessions ?? 10}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setUpdateQuotaDialogOpen(false);
                setSelectedUser(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => selectedUser && handleUpdateQuota(selectedUser.id)}
              disabled={updateQuotaMutation.isPending}
            >
              {updateQuotaMutation.isPending ? "Updating..." : "Update Limits"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <Dialog open={deleteUserDialogOpen} onOpenChange={setDeleteUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Delete User
            </DialogTitle>
            <DialogDescription>
              This action is permanent and cannot be undone. All data associated with this user will be deleted,
              including assistants, calls, sessions, CRM leads, and API credentials.
            </DialogDescription>
          </DialogHeader>
          {userToDelete && (
            <div className="py-4">
              <div className="rounded-md border border-destructive/20 bg-destructive/5 p-4 space-y-1">
                <p className="font-medium">{userToDelete.display_name}</p>
                <p className="text-sm text-muted-foreground">@{userToDelete.username}</p>
                <p className="text-sm text-muted-foreground">
                  {userToDelete.assistant_count} assistant(s) • {formatDuration(userToDelete.total_call_duration)} call time
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteUserDialogOpen(false);
                setUserToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending ? "Deleting..." : "Delete Permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Voice Dialog */}
      <Dialog open={editVoiceDialogOpen} onOpenChange={setEditVoiceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Voice</DialogTitle>
            <DialogDescription>
              Update voice metadata for{" "}
              <span className="font-mono">{selectedVoice?.speaker_id}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="voice-name">Display Name</Label>
              <Input
                id="voice-name"
                value={voiceForm.display_name}
                onChange={(e) =>
                  setVoiceForm((f) => ({ ...f, display_name: e.target.value }))
                }
                placeholder="Enter unique display name"
              />
            </div>
            <div className="space-y-2">
              <Label>Gender</Label>
              <Select
                value={voiceForm.gender}
                onValueChange={(v) => setVoiceForm((f) => ({ ...f, gender: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Accent</Label>
              <Select
                value={voiceForm.accent}
                onValueChange={(v) => setVoiceForm((f) => ({ ...f, accent: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select accent" />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "British",
                    "American",
                    "Scottish",
                    "Irish",
                    "Australian",
                    "Canadian",
                    "South African",
                    "Indian",
                    "Northern Irish",
                  ].map((accent) => (
                    <SelectItem key={accent} value={accent}>
                      {accent}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditVoiceDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateVoice}
              disabled={updateVoiceMutation.isPending || !voiceForm.display_name.trim()}
            >
              {updateVoiceMutation.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
