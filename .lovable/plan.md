

# 🎓 চাকরির পরিক্ষার MCQ Exam Platform

বাংলা ভাষায় একটি সম্পূর্ণ MCQ পরিক্ষা প্ল্যাটফর্ম — চাকরির প্রস্তুতির জন্য। External Supabase ব্যবহার করে Auth, Database, এবং RLS সহ।

---

## ফেজ ১: ডেটাবেস ও অথেনটিকেশন

### ১.১ Supabase কানেক্ট ও টেবিল তৈরি
- External Supabase প্রজেক্ট কানেক্ট করা
- সব টেবিল তৈরি: `profiles`, `user_roles`, `exams`, `questions`, `question_options`, `exam_questions`, `attempts`, `attempt_answers`, `coin_transactions`, `question_reports`
- প্রয়োজনীয় ইনডেক্স যোগ
- RLS পলিসি সেটআপ — roles আলাদা টেবিলে, `has_role()` security definer function সহ

### ১.২ অথেনটিকেশন সিস্টেম
- রেজিস্ট্রেশন (নাম, ইমেইল, পাসওয়ার্ড) — সব UI বাংলায়
- লগইন / লগআউট
- রেজিস্ট্রেশনে অটো profile ও default student role তৈরি
- Route Protection: `/admin/*` শুধু Admin, `/student/*` শুধু Student

---

## ফেজ ২: Admin Panel

### ২.১ Admin Dashboard
- মোট ইউজার, মোট পরিক্ষা, লাইভ পরিক্ষা, মোট Attempt, পাসের হার — সব stats কার্ডে
- সাইডবার মেনু (বাংলায়)

### ২.২ প্রশ্ন ব্যাংক (Question Bank)
- প্রশ্ন তৈরি: MCQ (একটি সঠিক), Fill in the blank, Multiple correct selection
- প্রতিটি অপশনে "কেন সঠিক/ভুল" ব্যাখ্যা
- Category/Topic, Difficulty ট্যাগিং
- প্রশ্ন সার্চ, ফিল্টার, এডিট, ডিলিট

### ২.৩ এক্সাম ম্যানেজমেন্ট
- এক্সাম তৈরি: শিরোনাম, বিবরণ, স্ট্যাটাস (draft/scheduled/live/ended), সময়, Duration
- প্রশ্ন সংখ্যা: ২৫/৫০/১০০ সিলেক্ট
- পাসমার্ক, Max attempts, Reward coins, Shuffle options, Negative marking সেটিংস
- Question Bank থেকে প্রশ্ন assign করা (সঠিক সংখ্যা ভ্যালিডেশন সহ)

### ২.৪ রিপোর্ট ম্যানেজমেন্ট
- রিপোর্টেড প্রশ্ন দেখা (Pending/Reviewed/Fixed/Rejected)
- Admin note যোগ করে status আপডেট
- প্রশ্ন এডিট করলেও আগের attempt এর result অক্ষত থাকবে

### ২.৫ ইউজার ও Attempt ম্যানেজমেন্ট
- সব পরিক্ষার্থীর তালিকা
- Attempt/Results দেখা
- Leaderboard viewer

---

## ফেজ ৩: Student Experience

### ৩.১ লাইভ পরিক্ষা
- লাইভ এক্সাম লিস্ট দেখা
- "পরিক্ষা শুরু করুন" বাটন → Attempt তৈরি, প্রশ্ন সেট lock
- পরিক্ষার স্ক্রিন: প্রশ্ন নম্বর, বাকি সময় (টাইমার), প্রগ্রেস বার
- Next/Previous নেভিগেশন
- Answer autosave (debounced) — ডাটা লস রোধ
- টাইমার শেষে অটো সাবমিট
- সাবমিট confirmation modal
- প্রতিটি প্রশ্নে Flag icon (রিপোর্ট করতে)

### ৩.২ ফলাফল (Result Review)
- মোট স্কোর, সঠিক/ভুল/স্কিপ সংখ্যা, Pass/Fail
- প্রতিটি প্রশ্নের বিস্তারিত: নিজের উত্তর, সঠিক উত্তর, Explanation, অপশনভিত্তিক ব্যাখ্যা
- ফিল্টার: সব/সঠিক/ভুল/স্কিপ

### ৩.৩ কয়েন সিস্টেম
- পাস করলে reward coins যোগ (idempotent — একবারই)
- কয়েন ব্যালেন্স দেখা
- কয়েন লেনদেন হিস্ট্রি (কোন পরিক্ষায় কত পেয়েছে)

### ৩.৪ লিডারবোর্ড
- প্রতি এক্সামের Top 10/50
- Tie-break: কম সময়ে সম্পন্ন → আগে সাবমিট
- "আমার অবস্থান" হাইলাইট

### ৩.৫ রিপোর্ট সিস্টেম
- Flag icon ক্লিক করে রিপোর্ট: টাইপ (ভুল উত্তর/বানান ভুল/তথ্য ভুল/অপশন কম/অন্যান্য) + বিস্তারিত মেসেজ

### ৩.৬ Student Dashboard
- আমার পরিক্ষাগুলো (Attempt history)
- ফলাফল
- লিডারবোর্ড
- কয়েন/ওয়ালেট

---

## ডিজাইন ও UI
- **সম্পূর্ণ বাংলা UI** — সব বাটন, লেবেল, মেসেজ, placeholder বাংলায়
- shadcn/ui কম্পোনেন্ট ব্যবহার করে আধুনিক, clean ডিজাইন
- Admin এবং Student আলাদা layout ও sidebar
- টেবিলে সার্চ + pagination + status filter
- মোবাইল responsive

