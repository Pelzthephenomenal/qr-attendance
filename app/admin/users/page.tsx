'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import api from '@/lib/api-client'
import { 
  Search, 
  Plus, 
  MoreHorizontal,
  GraduationCap,
  Briefcase,
  Mail,
  Edit,
  Trash2,
  Download,
  Upload
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

type UserType = 'all' | 'student' | 'lecturer'

export default function AdminUsersPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<UserType>('all')
  const [deptFilter, setDeptFilter] = useState('all')

  const [usersData, setUsersData] = useState<any[]>([])
  const [departmentsData, setDepartmentsData] = useState<any[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Dialog & Form States
  const [isOpenAddDialog, setIsOpenAddDialog] = useState(false)
  const [isOpenEditDialog, setIsOpenEditDialog] = useState(false)
  const [isOpenDeleteDialog, setIsOpenDeleteDialog] = useState(false)
  const [isOpenImportDialog, setIsOpenImportDialog] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any | null>(null)
  const [importFile, setImportFile] = useState<File | null>(null)

  const [formEmail, setFormEmail] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formFirstName, setFormFirstName] = useState('')
  const [formLastName, setFormLastName] = useState('')
  const [formRole, setFormRole] = useState('student')
  const [formDeptId, setFormDeptId] = useState('none')
  const [formMatricNo, setFormMatricNo] = useState('')
  const [formStaffNo, setFormStaffNo] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formIsActive, setFormIsActive] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchData = async () => {
    if (!user || user.role !== 'admin') return;
    try {
      setIsLoadingData(true)
      setError(null)
      const [usersRes, deptsRes] = await Promise.all([
        api.apiService.getUsers(),
        api.apiService.getDepartments()
      ])
      setUsersData(usersRes)
      setDepartmentsData(deptsRes)
    } catch (err) {
      setError(api.getErrorMessage(err))
    } finally {
      setIsLoadingData(false)
    }
  }

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'admin')) {
      router.push('/login')
    }
  }, [user, isLoading, router])

  useEffect(() => {
    if (!isLoading) fetchData()
  }, [user, isLoading])

  const openAdd = () => {
    setFormEmail('')
    setFormPassword('')
    setFormFirstName('')
    setFormLastName('')
    setFormRole('student')
    setFormDeptId('none')
    setFormMatricNo('')
    setFormStaffNo('')
    setFormPhone('')
    setFormIsActive(true)
    setIsOpenAddDialog(true)
  }

  const openEdit = (u: any) => {
    setSelectedUser(u)
    setFormEmail(u.email || '')
    setFormPassword('')
    setFormFirstName(u.first_name || '')
    setFormLastName(u.last_name || '')
    setFormRole(u.role || 'student')
    setFormDeptId(u.department_id || 'none')
    setFormMatricNo(u.matric_no || '')
    setFormStaffNo(u.staff_no || '')
    setFormPhone(u.phone || '')
    setFormIsActive(u.is_active !== undefined ? u.is_active : true)
    setIsOpenEditDialog(true)
  }

  const openDelete = (u: any) => {
    setSelectedUser(u)
    setIsOpenDeleteDialog(true)
  }

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const payload: any = {
        email: formEmail,
        password: formPassword,
        first_name: formFirstName,
        last_name: formLastName,
        role: formRole,
        phone: formPhone || null,
      }
      if (formDeptId && formDeptId !== 'none') {
        payload.department_id = formDeptId
      }
      if (formRole === 'student') {
        payload.matric_no = formMatricNo || null
        payload.staff_no = null
      } else if (formRole === 'lecturer') {
        payload.staff_no = formStaffNo || null
        payload.matric_no = null
      } else {
        payload.matric_no = null
        payload.staff_no = null
      }

      await api.apiService.createUser(payload)
      toast.success('User created successfully')
      setIsOpenAddDialog(false)
      fetchData()
    } catch (err) {
      toast.error(api.getErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return
    setIsSubmitting(true)
    try {
      const payload: any = {
        email: formEmail,
        first_name: formFirstName,
        last_name: formLastName,
        role: formRole,
        phone: formPhone || null,
        is_active: formIsActive,
      }
      payload.department_id = (formDeptId && formDeptId !== 'none') ? formDeptId : null
      
      if (formRole === 'student') {
        payload.matric_no = formMatricNo || null
        payload.staff_no = null
      } else if (formRole === 'lecturer') {
        payload.staff_no = formStaffNo || null
        payload.matric_no = null
      } else {
        payload.matric_no = null
        payload.staff_no = null
      }

      await api.apiService.updateUser(selectedUser.id, payload)
      toast.success('User updated successfully')
      setIsOpenEditDialog(false)
      fetchData()
    } catch (err) {
      toast.error(api.getErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteSubmit = async () => {
    if (!selectedUser) return
    setIsSubmitting(true)
    try {
      await api.apiService.deleteUser(selectedUser.id)
      toast.success('User deleted successfully')
      setIsOpenDeleteDialog(false)
      fetchData()
    } catch (err) {
      toast.error(api.getErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!importFile) return
    setIsSubmitting(true)
    try {
      const res = await api.apiService.bulkImportUsers(importFile)
      toast.success(`Imported ${res.imported} users successfully. ${res.errors.length > 0 ? 'Some errors occurred.' : ''}`)
      if (res.errors.length > 0) {
        console.error("Import errors:", res.errors)
        toast.error("Check console for import errors.")
      }
      setIsOpenImportDialog(false)
      setImportFile(null)
      fetchData()
    } catch (err) {
      toast.error(api.getErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading || !user) {
    return null
  }

  const filteredUsers = usersData.filter(u => {
    const name = `${u.first_name} ${u.last_name}`.toLowerCase()
    const matchesSearch = name.includes(searchQuery.toLowerCase()) ||
                          u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (u.matric_no && u.matric_no.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (u.staff_no && u.staff_no.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesType = typeFilter === 'all' || 
                        (typeFilter === 'student' && u.role === 'student') || 
                        (typeFilter === 'lecturer' && u.role === 'lecturer')
    
    const matchesDept = deptFilter === 'all' || u.department_id === deptFilter
    return matchesSearch && matchesType && matchesDept
  })

  const stats = {
    total: usersData.length,
    students: usersData.filter(u => u.role === 'student').length,
    lecturers: usersData.filter(u => u.role === 'lecturer').length,
    active: usersData.filter(u => u.is_active).length,
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">User Management</h1>
            <p className="text-muted-foreground mt-1">Manage students and lecturers</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={() => setIsOpenImportDialog(true)}>
              <Upload className="h-4 w-4" />
              Import
            </Button>
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button className="gap-2" onClick={openAdd}>
              <Plus className="h-4 w-4" />
              Add User
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Users</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-chart-1">{stats.students}</p>
                <p className="text-sm text-muted-foreground">Students</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-chart-2">{stats.lecturers}</p>
                <p className="text-sm text-muted-foreground">Lecturers</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-500">{stats.active}</p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as UserType)}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="User type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="student">Students</SelectItem>
                  <SelectItem value="lecturer">Lecturers</SelectItem>
                </SelectContent>
              </Select>
              <Select value={deptFilter} onValueChange={setDeptFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departmentsData.map(dept => (
                    <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Loading and Error States */}
        {isLoadingData && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}

        {error && !isLoadingData && (
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-center justify-between">
            <p>{error}</p>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Retry</Button>
          </div>
        )}

        {!isLoadingData && !error && usersData.length === 0 && (
          <div className="text-center py-12 border rounded-lg border-dashed">
            <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">No Users Found</h3>
            <p className="text-muted-foreground mt-1 mb-4">You haven't added any users to your organization yet.</p>
            <Button onClick={openAdd}>Add Your First User</Button>
          </div>
        )}

        {/* Users Table */}
        {!isLoadingData && !error && usersData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Users</CardTitle>
              <CardDescription>
                Showing {filteredUsers.length} of {usersData.length} users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[70px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={`h-9 w-9 rounded-full flex items-center justify-center ${
                            u.role === 'student' ? 'bg-chart-1/10' : 'bg-chart-2/10'
                          }`}>
                            {u.role === 'student' ? (
                              <GraduationCap className="h-4 w-4 text-chart-1" />
                            ) : (
                              <Briefcase className="h-4 w-4 text-chart-2" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{u.first_name} {u.last_name}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {u.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{u.matric_no || u.staff_no || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant={u.role === 'student' ? 'default' : 'secondary'}>
                          {u.role === 'lecturer' ? 'lecturer' : u.role}
                        </Badge>
                      </TableCell>
                      <TableCell>{departmentsData.find(d => d.id === u.department_id)?.name || 'Unassigned'}</TableCell>
                      <TableCell>
                        <Badge variant={u.is_active ? 'outline' : 'secondary'} className={
                          u.is_active ? 'border-green-500 text-green-500' : ''
                        }>
                          {u.is_active ? 'active' : 'inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(u)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => openDelete(u)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Dialogs */}
        <Dialog open={isOpenAddDialog} onOpenChange={setIsOpenAddDialog}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>
                Create a new student, lecturer, or administrator account.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddSubmit} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name</Label>
                  <Input
                    id="first_name"
                    placeholder="John"
                    value={formFirstName}
                    onChange={(e) => setFormFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    placeholder="Doe"
                    value={formLastName}
                    onChange={(e) => setFormLastName(e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john.doe@university.edu"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password (min 8 chars)</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={formRole} onValueChange={(val) => setFormRole(val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="lecturer">Lecturer</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dept">Department</Label>
                  <Select value={formDeptId} onValueChange={(val) => setFormDeptId(val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select dept" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None / General</SelectItem>
                      {departmentsData.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formRole === 'student' && (
                <div className="space-y-2">
                  <Label htmlFor="matric_no">Matric Number</Label>
                  <Input
                    id="matric_no"
                    placeholder="CVE/2021/001"
                    value={formMatricNo}
                    onChange={(e) => setFormMatricNo(e.target.value)}
                    required
                  />
                </div>
              )}

              {formRole === 'lecturer' && (
                <div className="space-y-2">
                  <Label htmlFor="staff_no">Staff Number</Label>
                  <Input
                    id="staff_no"
                    placeholder="STF/2021/001"
                    value={formStaffNo}
                    onChange={(e) => setFormStaffNo(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number (Optional)</Label>
                <Input
                  id="phone"
                  placeholder="+1234567890"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                />
              </div>

              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsOpenAddDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create User'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isOpenEditDialog} onOpenChange={setIsOpenEditDialog}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit User Details</DialogTitle>
              <DialogDescription>
                Update account details for the selected user.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_first_name">First Name</Label>
                  <Input
                    id="edit_first_name"
                    value={formFirstName}
                    onChange={(e) => setFormFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_last_name">Last Name</Label>
                  <Input
                    id="edit_last_name"
                    value={formLastName}
                    onChange={(e) => setFormLastName(e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit_email">Email</Label>
                <Input
                  id="edit_email"
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_role">Role</Label>
                  <Select value={formRole} onValueChange={(val) => setFormRole(val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="lecturer">Lecturer</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_dept">Department</Label>
                  <Select value={formDeptId} onValueChange={(val) => setFormDeptId(val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select dept" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None / General</SelectItem>
                      {departmentsData.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formRole === 'student' && (
                <div className="space-y-2">
                  <Label htmlFor="edit_matric_no">Matric Number</Label>
                  <Input
                    id="edit_matric_no"
                    value={formMatricNo}
                    onChange={(e) => setFormMatricNo(e.target.value)}
                    required
                  />
                </div>
              )}

              {formRole === 'lecturer' && (
                <div className="space-y-2">
                  <Label htmlFor="edit_staff_no">Staff Number</Label>
                  <Input
                    id="edit_staff_no"
                    value={formStaffNo}
                    onChange={(e) => setFormStaffNo(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="edit_phone">Phone Number</Label>
                <Input
                  id="edit_phone"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-between border-t pt-4">
                <div className="space-y-0.5">
                  <Label htmlFor="edit_status" className="font-medium">Active Status</Label>
                  <p className="text-xs text-muted-foreground">Toggle to enable/disable user login access.</p>
                </div>
                <Switch
                  id="edit_status"
                  checked={formIsActive}
                  onCheckedChange={setFormIsActive}
                />
              </div>

              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsOpenEditDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isOpenDeleteDialog} onOpenChange={setIsOpenDeleteDialog}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Delete User</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete {selectedUser?.first_name} {selectedUser?.last_name}? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0 mt-4">
              <Button variant="outline" onClick={() => setIsOpenDeleteDialog(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteSubmit} disabled={isSubmitting}>
                {isSubmitting ? 'Deleting...' : 'Delete User'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isOpenImportDialog} onOpenChange={setIsOpenImportDialog}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Import Users from CSV</DialogTitle>
              <DialogDescription>
                Upload a CSV file containing user records. Required columns: email, first_name, last_name, role. Optional: matric_no, staff_no, phone.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleImportSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="csv_file">CSV File</Label>
                <Input
                  id="csv_file"
                  type="file"
                  accept=".csv"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  required
                />
              </div>
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsOpenImportDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting || !importFile}>
                  {isSubmitting ? 'Importing...' : 'Upload & Import'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
