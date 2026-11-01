# Security Specification (`security_spec.md`)

## 1. Authentication & Identity Model
- **Teachers**: Sign in with Google via Firebase Authentication (`request.auth != null`). Their profile is stored at `/teachers/{uid}` where `uid == request.auth.uid`.
- **Students**: Sign in via Firebase Authentication (Google Sign-In or Anonymous Auth session bound to their unique `request.auth.uid`) and join a class using `joinCode` + `studentCode`. Each student is bound to `/classes/{classId}/students/{studentUid}` where `studentUid == request.auth.uid`.
- **Demo Mode**: Runs strictly in-memory/local in the browser without writing to Firestore.

## 2. Collection-by-Collection Access Control & Invariants

### `/teachers/{uid}`
- **Read**: Authenticated owner (`request.auth.uid == uid`).
- **Create / Update**: Authenticated owner (`request.auth.uid == uid`), `request.resource.data.uid == uid`, `request.resource.data.role == 'teacher'`.
- **Delete**: `false`.

### `/classes/{classId}`
- **Read**: Any authenticated user (`request.auth != null`) may read class metadata to look up `joinCode` when joining a class.
- **Create**: Authenticated teacher where `request.resource.data.teacherUid == request.auth.uid` and `name`, `hskLevel`, `joinCode` are non-empty strings.
- **Update / Delete**: Only the owning teacher (`resource.data.teacherUid == request.auth.uid`), and `teacherUid` is immutable on update.

### `/classes/{classId}/students/{studentUid}`
- **Read**: Owning class teacher (`isClassTeacher(classId)`), or a student reading their own record (`request.auth.uid == studentUid`), or an authenticated student reading a pre-created invite slot (`resource.data.studentUid == null` or `resource.data.studentUid == ''` or `resource.data.studentUid == request.auth.uid`) during class join.
- **Create**:
  - Owning class teacher (`isClassTeacher(classId)`) when pre-registering student codes (`HV-001`, etc.) or importing a backup; OR
  - Authenticated student (`request.auth.uid == studentUid`) claiming their student profile in the class with valid `name`, `studentCode`, `joinedAt`.
- **Update**:
  - Owning class teacher (`isClassTeacher(classId)`); OR
  - Authenticated student (`request.auth.uid == studentUid`) binding their `studentUid` or updating their own progress while keeping `studentCode` and `joinedAt` immutable.
- **Delete**: Owning class teacher (`isClassTeacher(classId)`).

### `/classes/{classId}/decks/{deckId}` & `/classes/{classId}/assignments/{assignmentId}`
- **Read**: Owning class teacher (`isClassTeacher(classId)`) OR enrolled student of that class (`isEnrolledStudent(classId)`).
- **Create / Update / Delete**: Strictly owning class teacher (`isClassTeacher(classId)`).

### `/classes/{classId}/submissions/{submissionId}`
- **Read**: Strictly the submitting student (`resource.data.studentUid == request.auth.uid`) OR the owning class teacher (`isClassTeacher(classId)`). Students CANNOT read other students' submissions.
- **Create**: Enrolled student of the class (`isEnrolledStudent(classId)`) creating a submission for themselves (`request.resource.data.studentUid == request.auth.uid`) with valid fields (`assignmentId is string`, `score is number`, `score >= 0 && score <= 100`, `answers is map`, `submittedAt is string`).
- **Update / Delete**: Students are strictly forbidden from updating or deleting submissions after creation (`false` for students). Only the owning class teacher (`isClassTeacher(classId)`) may delete a submission if resetting a class.

### `/classes/{classId}/leaderboard/{studentUid}`
- **Read**: Owning class teacher (`isClassTeacher(classId)`) OR enrolled student of the class (`isEnrolledStudent(classId)`). Exposes only sanitized summary fields (`studentUid`, `studentCode`, `name`, `hskLevel`, `score`, `timeSeconds`, `streak`, `updatedAt`).
- **Create / Update**: Owning class teacher (`isClassTeacher(classId)`) OR the student themselves (`request.auth.uid == studentUid` and `isEnrolledStudent(classId)`) with strict schema validation (`score >= 0 && score <= 100`, `name.size() > 0 && name.size() <= 100`).
- **Delete**: Owning class teacher (`isClassTeacher(classId)`).

### `/users/{studentUid}/srs/{wordId}`
- **Read / Create / Update / Delete**: Strictly the owning student (`request.auth.uid == studentUid`) with valid `wordId`, `hanzi`, and boolean `learned`.
