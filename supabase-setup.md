# 🚀 Supabase Integration Guide for School Platform

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up
2. Create new project:
   - Name: "School Platform"
   - Region: Choose closest to your users
   - Database password: Save this securely

## Step 2: Database Schema

Run these SQL commands in Supabase SQL Editor:

```sql
-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Users table (extends Supabase auth)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  role TEXT DEFAULT 'teacher',
  school_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- Classes table
CREATE TABLE classes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  section TEXT NOT NULL,
  teacher_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  assignments TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Students table
CREATE TABLE students (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  student_id TEXT NOT NULL,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  grades JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, class_id)
);

-- Attendance table
CREATE TABLE attendance_records (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT CHECK (status IN ('present', 'absent', 'tardy')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, class_id, date)
);

-- User data table for storing app-specific data
CREATE TABLE user_data (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Row Level Security Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;

-- Teachers can only see their own data
CREATE POLICY "Teachers can view own profile" ON profiles
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Teachers can manage own classes" ON classes
  FOR ALL USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can manage students in own classes" ON students
  FOR ALL USING (
    class_id IN (
      SELECT id FROM classes WHERE teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can manage attendance for own classes" ON attendance_records
  FOR ALL USING (
    class_id IN (
      SELECT id FROM classes WHERE teacher_id = auth.uid()
    )
  );

-- User data policies
CREATE POLICY "Users can manage own data" ON user_data
  FOR ALL USING (auth.uid() = user_id);
```

## Step 3: Install Supabase Client

```bash
npm install @supabase/supabase-js
```

## Step 4: Environment Variables

Create `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Step 5: Integration Benefits

- **Real-time sync** across devices
- **Secure authentication** 
- **Automatic backups** and point-in-time recovery
- **Scalable** to multiple schools/districts
- **Data privacy** with row-level security
- **API access** for future mobile apps

## Alternative Options

### Firebase (Google)
- Pros: Even easier setup, real-time by default
- Cons: NoSQL (less familiar), vendor lock-in

### Vercel + Postgres
- Pros: Same platform as deployment
- Cons: More manual setup, less features

### MongoDB Atlas
- Pros: Flexible schema, great for prototyping  
- Cons: Need to build auth, more complex setup