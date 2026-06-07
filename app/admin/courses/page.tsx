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
import { Switch } from '@/components/ui/switch'
import api from '@/lib/api-client'
import { 
  Search, 
  Plus, 
  MoreHorizontal,
  BookOpen,
  Users,
  Clock,
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

export default function AdminCoursesPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [deptFilter, setDeptFilter] = useState('all')

  const [coursesData, setCoursesData] = useState<any[]>([])
  const [departmentsData, setDepartmentsData] = useState<any[]>([])
  const [lecturersData, setLecturersData] = useState<any[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Dialog & Form States
  const [isOpenAddDialog, setIsOpenAddDialog] = useState(false)
  const [isOpenEditDialog, setIsOpenEditDialog] = useState(false)
  const [isOpenDeleteDialog, setIsOpenDeleteDialog] = useState(false)
  const [isOpenImportDialog, setIsOpenImportDialog] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null)

  const [formCode, setFormCode] = useState('')
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formDeptId, setFormDeptId] = useState('none')
  const [formAcademicYear, setFormAcademicYear] = useState('')
  const [formTerm, setFormTerm] = useState('')
  const [formLevel, setFormLevel] = useState('')
  const [formIsActive, setFormIsActive] = useState(true)
  const [formInstructorIds, setFormInstructorIds] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchData = async () => {
    if (!user || user.role !== 'admin') return;
    try {
      setIsLoadingData(true)
      setError(null)
      const [coursesRes, deptsRes, usersRes] = await Promise.all([
        api.apiService.getCourses(),
        api.apiService.getDepartments(),
        api.apiService.getUsers()
      ])
      setCoursesData(coursesRes)
      setDepartmentsData(deptsRes)
      setLecturersData(usersRes.filter((u: any) => u.role === 'lecturer'))
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
    setFormCode('')
    setFormTitle('')
    setFormDescription('')
    setFormDeptId('none')
    setFormAcademicYear('')
    setFormTerm('')
    setFormLevel('')
    setFormIsActive(true)
    setFormInstructorIds([])
    setIsOpenAddDialog(true)
  }

  const openEdit = (course: any) => {
    setSelectedCourse(course)
    setFormCode(course.code || '')
    setFormTitle(course.title || '')
    setFormDescription(course.description || '')
    setFormDeptId(course.department_id || 'none')
    setFormAcademicYear(course.academic_year || '')
    setFormTerm(course.term || '')
    setFormLevel(course.level || '')
    setFormIsActive(course.is_active !== undefined ? course.is_active : true)
    setFormInstructorIds(course.instructor_ids || [])
    setIsOpenEditDialog(true)
  }

  const openDelete = (course: any) => {
    setSelectedCourse(course)
    setIsOpenDeleteDialog(true)
  }

  const openImportEnrollments = (course: any) => {
    setSelectedCourse(course)
    setImportFile(null)
    setIsOpenImportDialog(true)
  }

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const payload: any = {
        code: formCode,
        title: formTitle,
        description: formDescription || null,
        academic_year: formAcademicYear || null,
        term: formTerm || null,
        level: formLevel || null,
        is_active: formIsActive,
        instructor_ids: formInstructorIds.length > 0 ? formInstructorIds : null
      }
      payload.department_id = (formDeptId && formDeptId !== 'none') ? formDeptId : null

      await api.apiService.createCourse(payload)
      toast.success('Course created successfully')
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
    if (!selectedCourse) return
    setIsSubmitting(true)
    try {
      const payload: any = {
        code: formCode,
        title: formTitle,
        description: formDescription || null,
        academic_year: formAcademicYear || null,
        term: formTerm || null,
        level: formLevel || null,
        is_active: formIsActive,
        instructor_ids: formInstructorIds.length > 0 ? formInstructorIds : null
      }
      payload.department_id = (formDeptId && formDeptId !== 'none') ? formDeptId : null

      await api.apiService.updateCourse(selectedCourse.id, payload)
      toast.success('Course updated successfully')
      setIsOpenEditDialog(false)
      fetchData()
    } catch (err) {
      toast.error(api.getErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteSubmit = async () => {
    if (!selectedCourse) return
    setIsSubmitting(true)
    try {
      await api.apiService.deleteCourse(selectedCourse.id)
      toast.success('Course deleted successfully')
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
    if (!selectedCourse || !importFile) return
    setIsSubmitting(true)
    try {
      const res = await api.apiService.bulkImportEnrollments(selectedCourse.id, importFile)
      toast.success(`Imported ${res.imported} enrollments successfully. ${res.errors.length > 0 ? 'Some errors occurred.' : ''}`)
      if (res.errors.length > 0) {
        console.error("Import errors:", res.errors)
        toast.error("Check console for import errors.")
      }
      setIsOpenImportDialog(false)
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

  const filteredCourses = coursesData.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          course.code.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesDept = deptFilter === 'all' || course.department_id === deptFilter
    return matchesSearch && matchesDept
  })

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Course Management</h1>
            <p className="text-muted-foreground mt-1">Manage courses and class schedules</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button className="gap-2" onClick={openAdd}>
              <Plus className="h-4 w-4" />
              Add Course
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Courses</p>
                  <p className="text-2xl font-bold">{coursesData.length}</p>
                </div>
                <BookOpen className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Students</p>
                  <p className="text-2xl font-bold">
                    {coursesData.reduce((acc, c) => acc + (c.student_count || 0), 0)}
                  </p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Courses</p>
                  <p className="text-2xl font-bold">
                    {coursesData.filter(c => c.is_active).length}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-muted-foreground" />
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
                  placeholder="Search by course name or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
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

        {!isLoadingData && !error && coursesData.length === 0 && (
          <div className="text-center py-12 border rounded-lg border-dashed">
            <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">No Courses Found</h3>
            <p className="text-muted-foreground mt-1 mb-4">You haven't added any courses to your organization yet.</p>
            <Button onClick={openAdd}>Add Your First Course</Button>
          </div>
        )}

        {/* Courses Table */}
        {!isLoadingData && !error && coursesData.length > 0 && (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Course Code</TableHead>
                    <TableHead>Course Name</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Students</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCourses.map((course) => (
                    <TableRow key={course.id}>
                      <TableCell className="font-medium pl-6">{course.code}</TableCell>
                      <TableCell>{course.title}</TableCell>
                      <TableCell>{departmentsData.find(d => d.id === course.department_id)?.name || 'Unassigned'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          {course.student_count}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          course.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                        }`}>
                          {course.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(course)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openImportEnrollments(course)}>
                              <Upload className="mr-2 h-4 w-4" />
                              Import Enrollments
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => openDelete(course)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Course
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
              <DialogTitle>Add New Course</DialogTitle>
              <DialogDescription>
                Create a new course in the curriculum registry.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddSubmit} className="space-y-4 pt-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2 col-span-1">
                  <Label htmlFor="code">Code</Label>
                  <Input
                    id="code"
                    placeholder="CSE 301"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="title">Course Title</Label>
                  <Input
                    id="title"
                    placeholder="Software Engineering"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Input
                  id="description"
                  placeholder="Overview and class prerequisites"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                <div className="space-y-2">
                  <Label htmlFor="academic_year">Academic Year</Label>
                  <Input
                    id="academic_year"
                    placeholder="2025/2026"
                    value={formAcademicYear}
                    onChange={(e) => setFormAcademicYear(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="term">Term / Semester</Label>
                  <Input
                    id="term"
                    placeholder="First Semester"
                    value={formTerm}
                    onChange={(e) => setFormTerm(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="level">Level</Label>
                  <Input
                    id="level"
                    placeholder="300 Level"
                    value={formLevel}
                    onChange={(e) => setFormLevel(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right text-muted-foreground font-medium mt-2">Instructors</Label>
                <div className="col-span-3">
                  <select
                    multiple
                    value={formInstructorIds}
                    onChange={(e) => {
                      const options = Array.from(e.target.selectedOptions);
                      setFormInstructorIds(options.map(o => o.value));
                    }}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    style={{ minHeight: '100px' }}
                  >
                    {lecturersData.map((lecturer) => (
                      <option key={lecturer.id} value={lecturer.id}>
                        {lecturer.first_name} {lecturer.last_name} ({lecturer.email})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">Hold Ctrl (Windows) or Cmd (Mac) to select multiple.</p>
                </div>
              </div>

              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsOpenAddDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Course'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isOpenEditDialog} onOpenChange={setIsOpenEditDialog}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Course Details</DialogTitle>
              <DialogDescription>
                Update details for the selected course.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-4 pt-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2 col-span-1">
                  <Label htmlFor="edit_code">Code</Label>
                  <Input
                    id="edit_code"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="edit_title">Course Title</Label>
                  <Input
                    id="edit_title"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_description">Description</Label>
                <Input
                  id="edit_description"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                <div className="space-y-2">
                  <Label htmlFor="edit_academic_year">Academic Year</Label>
                  <Input
                    id="edit_academic_year"
                    value={formAcademicYear}
                    onChange={(e) => setFormAcademicYear(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_term">Term / Semester</Label>
                  <Input
                    id="edit_term"
                    value={formTerm}
                    onChange={(e) => setFormTerm(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_level">Level</Label>
                  <Input
                    id="edit_level"
                    value={formLevel}
                    onChange={(e) => setFormLevel(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_instructors">Instructors</Label>
                <select
                  id="edit_instructors"
                  multiple
                  value={formInstructorIds}
                  onChange={(e) => {
                    const options = Array.from(e.target.selectedOptions);
                    setFormInstructorIds(options.map(o => o.value));
                  }}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ minHeight: '100px' }}
                >
                  {lecturersData.map((lecturer) => (
                    <option key={lecturer.id} value={lecturer.id}>
                      {lecturer.first_name} {lecturer.last_name} ({lecturer.email})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1">Hold Ctrl (Windows) or Cmd (Mac) to select multiple.</p>
              </div>

              <div className="flex items-center justify-between border-t pt-4">
                <div className="space-y-0.5">
                  <Label htmlFor="edit_status" className="font-medium">Course Status</Label>
                  <p className="text-xs text-muted-foreground">Toggle to enable/disable this course registry.</p>
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
              <DialogTitle>Delete Course</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete course {selectedCourse?.code}: {selectedCourse?.title}? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0 mt-4">
              <Button variant="outline" onClick={() => setIsOpenDeleteDialog(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteSubmit} disabled={isSubmitting}>
                {isSubmitting ? 'Deleting...' : 'Delete Course'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isOpenImportDialog} onOpenChange={setIsOpenImportDialog}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Import Enrollments</DialogTitle>
              <DialogDescription>
                Upload a CSV file with student enrollments for {selectedCourse?.title}. Required columns: student_email or matric_no.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleImportSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="enroll_csv_file">CSV File</Label>
                <Input
                  id="enroll_csv_file"
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
