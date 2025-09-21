grocery-list-app/
├── index.html
├── css/
│   ├── style.css
│   └── auth.css
├── js/
│   ├── main.js
│   ├── auth.js
│   ├── listManager.js
│   ├── supabaseClient.js
│   ├── exportUtils.js
│   ├── summary.js
│   └── utils.js
└── assets/
    ├── icons/
    └── images/



    This modular structure organizes the code into logical components:

HTML File: Contains the main structure and imports all CSS and JS files

CSS Files: Separated into main styles and authentication-specific styles

JavaScript Files:

supabaseClient.js: Initializes the Supabase client

utils.js: Contains utility functions used across the application

auth.js: Handles authentication-related functionality

listManager.js: Manages grocery list operations (CRUD, sharing, etc.)

exportUtils.js: Handles PDF and Excel export functionality

summary.js: Generates summary reports

main.js: Initializes the application and handles event listeners

This structure makes the code more maintainable, scalable, and easier to test. Each module has a clear responsibility, and dependencies are explicitly imported.



-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table to store user information
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create grocery_lists table
CREATE TABLE IF NOT EXISTS grocery_lists (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT,
    supermarket TEXT,
    month INTEGER,
    year INTEGER,
    items JSONB DEFAULT '[]'::jsonb,
    total_amount NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create list_shares table for sharing functionality
CREATE TABLE IF NOT EXISTS list_shares (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    list_id UUID REFERENCES grocery_lists(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    can_edit BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(list_id, user_id)
);

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE grocery_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_shares ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles table
CREATE POLICY "Users can view own profile" 
    ON profiles FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
    ON profiles FOR UPDATE 
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
    ON profiles FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- Create policies for grocery_lists table
CREATE POLICY "Users can view own lists" 
    ON grocery_lists FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view shared lists" 
    ON grocery_lists FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM list_shares 
            WHERE list_shares.list_id = grocery_lists.id 
            AND list_shares.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own lists" 
    ON grocery_lists FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own lists" 
    ON grocery_lists FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own lists" 
    ON grocery_lists FOR DELETE 
    USING (auth.uid() = user_id);

-- Create policies for list_shares table
CREATE POLICY "Users can view shares they are part of" 
    ON list_shares FOR SELECT 
    USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM grocery_lists 
            WHERE grocery_lists.id = list_shares.list_id 
            AND grocery_lists.user_id = auth.uid()
        )
    );

CREATE POLICY "List owners can create shares" 
    ON list_shares FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM grocery_lists 
            WHERE grocery_lists.id = list_shares.list_id 
            AND grocery_lists.user_id = auth.uid()
        )
    );

CREATE POLICY "List owners can update shares" 
    ON list_shares FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM grocery_lists 
            WHERE grocery_lists.id = list_shares.list_id 
            AND grocery_lists.user_id = auth.uid()
        )
    );

CREATE POLICY "List owners can delete shares" 
    ON list_shares FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM grocery_lists 
            WHERE grocery_lists.id = list_shares.list_id 
            AND grocery_lists.user_id = auth.uid()
        )
    );

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile on user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();