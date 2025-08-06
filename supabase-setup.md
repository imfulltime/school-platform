# 🚀 Supabase Integration Guide for School Platform

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up
2. Create new project:
   - Name: "School Platform"
   - Region: Choose closest to your users
   - Database password: Save this securely

## Step 2: Database Schema

**Important**: Run these SQL commands in Supabase SQL Editor (Dashboard → SQL Editor → New Query):

> ⚠️ **Note**: Run the entire script at once, or if you get errors, run each table creation separately in the order shown below.

```sql
-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Teacher profiles table (extends Supabase auth)
CREATE TABLE teacher_profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  title TEXT,
  employee_id TEXT UNIQUE,
  department TEXT,
  phone_number TEXT,
  date_of_birth DATE,
  hire_date DATE,
  school_name TEXT,
  years_experience INTEGER,
  qualifications TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relation TEXT,
  additional_info TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- Classes table with year and section
CREATE TABLE classes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  year TEXT NOT NULL,
  section TEXT NOT NULL,
  teacher_id UUID REFERENCES teacher_profiles(id) ON DELETE CASCADE,
  assignments TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name, year, section, teacher_id)
);

-- Comprehensive student profiles table
CREATE TABLE student_profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  middle_initial TEXT,
  date_of_birth DATE,
  gender TEXT,
  phone_number TEXT,
  email TEXT,
  address TEXT,
  
  -- Parent/Guardian 1
  parent1_name TEXT,
  parent1_phone TEXT,
  parent1_email TEXT,
  parent1_relation TEXT,
  
  -- Parent/Guardian 2
  parent2_name TEXT,
  parent2_phone TEXT,
  parent2_email TEXT,
  parent2_relation TEXT,
  
  -- Academic Information
  grade_level TEXT,
  academic_year TEXT,
  enrollment_date DATE,
  primary_class_id UUID REFERENCES classes(id),
  section TEXT,
  previous_school TEXT,
  
  -- Additional Information
  medical_info TEXT,
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Student class enrollments (many-to-many relationship)
CREATE TABLE student_enrollments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id UUID REFERENCES student_profiles(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  enrollment_date DATE DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, class_id)
);

-- Student grades table
CREATE TABLE student_grades (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id UUID REFERENCES student_profiles(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  assignment_name TEXT NOT NULL,
  grade NUMERIC,
  max_grade NUMERIC DEFAULT 100,
  assignment_type TEXT,
  date_recorded DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Attendance records table
CREATE TABLE attendance_records (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id UUID REFERENCES student_profiles(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT CHECK (status IN ('present', 'absent', 'tardy')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, class_id, date)
);

-- User data backup table for localStorage migration
CREATE TABLE user_data (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  data_key TEXT NOT NULL,
  data_value JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, data_key)
);

-- Row Level Security Policies
ALTER TABLE teacher_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;

-- Teachers can only see their own data
CREATE POLICY "Teachers can view own profile" ON teacher_profiles
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Teachers can manage own classes" ON classes
  FOR ALL USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can manage students in own classes" ON student_profiles
  FOR ALL USING (
    id IN (
      SELECT se.student_id FROM student_enrollments se
      JOIN classes c ON se.class_id = c.id
      WHERE c.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can manage enrollments for own classes" ON student_enrollments
  FOR ALL USING (
    class_id IN (
      SELECT id FROM classes WHERE teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can manage grades for own classes" ON student_grades
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

CREATE POLICY "Users can manage own data" ON user_data
  FOR ALL USING (auth.uid() = user_id);
```

## Step 3: Install Supabase Client

```bash
npm install @supabase/supabase-js
```

## Step 4: Configure Your Application

Update `js/supabase-client.js` with your Supabase credentials:

```javascript
// Replace these values with your actual Supabase credentials
const supabaseUrl = 'YOUR_SUPABASE_URL'          // From Supabase Settings → API
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY'     // From Supabase Settings → API

export const supabase = createClient(supabaseUrl, supabaseKey)
```

**Getting Your Credentials:**
1. Go to Supabase Dashboard → Settings → API
2. Copy your Project URL
3. Copy your anon/public key (NOT the service_role key)

## Step 5: Data Migration (Optional)

If you have existing data in localStorage, our application includes automatic migration tools:

1. Open `auth.html` and sign in with your new Supabase account
2. If localStorage data is detected, you'll see a migration option
3. Click "Migrate Data" to transfer all your existing:
   - Class records and students
   - Student profiles with full details
   - Teacher profile information
   - Attendance records
   - Grade data

## Step 6: Features You'll Gain

### ✅ **Immediate Benefits**
- **Real-time sync** across all devices (phone, tablet, computer)
- **Secure authentication** with email verification
- **Automatic backups** - never lose data again
- **Multi-device access** - start on desktop, continue on mobile
- **Data privacy** with row-level security policies

### 🚀 **Advanced Capabilities**
- **Scalable architecture** - support multiple teachers and schools
- **Professional data management** - proper relational database
- **API access** for future mobile app development
- **Real-time collaboration** - multiple users can work simultaneously
- **Data analytics** - advanced reporting and insights
- **Audit trails** - track all changes and updates

### 📊 **Enhanced Data Structure**
- **Comprehensive student profiles** with parent/guardian information
- **Flexible class management** with year and section support
- **Detailed grade tracking** with assignment types and categories
- **Rich attendance records** with notes and historical data
- **Teacher profiles** with professional information and credentials

## Alternative Backend Options

### Why Supabase is Recommended ⭐

✅ **Perfect match** for our application structure  
✅ **PostgreSQL** - familiar SQL with advanced features  
✅ **Built-in authentication** - no additional setup needed  
✅ **Row-level security** - enterprise-grade data protection  
✅ **Real-time subscriptions** - instant updates across devices  
✅ **Generous free tier** - 500MB database, 50,000 monthly active users  
✅ **Easy migration** - direct compatibility with our data structure  

### Other Options

#### Firebase (Google)
- **Pros**: Real-time by default, massive ecosystem
- **Cons**: NoSQL structure requires data restructuring, vendor lock-in
- **Setup time**: ~30 minutes (need to redesign data structure)
- **Cost**: Pay-as-you-go pricing

#### Vercel Postgres + Auth0
- **Pros**: Same platform as deployment, PostgreSQL
- **Cons**: Multiple services to configure, more expensive
- **Setup time**: ~60 minutes (separate auth setup)
- **Cost**: $20/month minimum for database

#### PlanetScale + Clerk
- **Pros**: Serverless MySQL, modern auth
- **Cons**: Multiple service integration, learning curve
- **Setup time**: ~45 minutes
- **Cost**: $29/month for production features

#### Self-hosted (Advanced)
- **Pros**: Full control, cost-effective at scale
- **Cons**: Server management, security responsibility, backup setup
- **Setup time**: 2-4 hours
- **Cost**: $5-50/month depending on hosting

## 💡 **Recommendation**

For the School Platform, **Supabase is the clear winner** because:
1. Our database schema maps perfectly to PostgreSQL
2. Authentication is already built into our `auth.html`
3. Migration tools are ready and tested
4. Free tier covers most school use cases
5. Can scale to district-level deployment

## 🔧 Troubleshooting Common Issues

### Error: "permission denied to set parameter"
**Solution**: This is expected in managed Supabase. The updated SQL script above removes the problematic `ALTER DATABASE` command.

### Error: "relation already exists"
**Solution**: Tables already exist. You can either:
1. Skip the table creation (tables are already set up)
2. Drop existing tables first: `DROP TABLE IF EXISTS table_name CASCADE;`

### Error: "function uuid_generate_v4() does not exist"
**Solution**: Run this first:
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### RLS Policies Not Working
**Solution**: Make sure you're signed in to test. RLS policies only apply to authenticated users. The `auth.uid()` function returns the current user's ID.

### Tables Created But Can't Access Data
**Solution**: 
1. Verify RLS is enabled: `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';`
2. Check policies exist: `SELECT * FROM pg_policies WHERE schemaname = 'public';`

### Need to Reset Database
**Solution**: To start fresh, run this before the main script:
```sql
-- Drop all tables (careful - this deletes all data!)
DROP TABLE IF EXISTS user_data CASCADE;
DROP TABLE IF EXISTS attendance_records CASCADE;
DROP TABLE IF EXISTS student_grades CASCADE;
DROP TABLE IF EXISTS student_enrollments CASCADE;
DROP TABLE IF EXISTS student_profiles CASCADE;
DROP TABLE IF EXISTS classes CASCADE;
DROP TABLE IF EXISTS teacher_profiles CASCADE;
```