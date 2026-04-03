import { Link } from "wouter";
import { useGetFeedStats, getGetFeedStatsQueryKey, useListFeaturedProfiles, getListFeaturedProfilesQueryKey, useListFeaturedJobs, getListFeaturedJobsQueryKey } from "@workspace/api-client-react";
import { ProfileCard } from "@/components/profile-card";
import { JobCard } from "@/components/job-card";
import { LoadingState, ErrorState } from "@/components/loading-state";
import { Button } from "@/components/ui/button";
import { ArrowRightIcon, SearchIcon, UsersIcon, BriefcaseIcon, BuildingIcon, GlobeIcon, ActivityIcon } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function Home() {
  const { 
    data: stats, 
    isLoading: loadingStats, 
    error: statsError 
  } = useGetFeedStats({ query: { queryKey: getGetFeedStatsQueryKey() } });
  
  const { 
    data: featuredProfiles, 
    isLoading: loadingProfiles 
  } = useListFeaturedProfiles({ query: { queryKey: getListFeaturedProfilesQueryKey() } });
  
  const { 
    data: featuredJobs, 
    isLoading: loadingJobs 
  } = useListFeaturedJobs({ query: { queryKey: getListFeaturedJobsQueryKey() } });

  if (statsError) {
    return <ErrorState error={statsError} />;
  }

  return (
    <div className="flex flex-col w-full pb-24">
      {/* Hero Section */}
      <section className="relative bg-muted/30 pt-20 pb-28 overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:20px_20px]" />
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-50 pointer-events-none" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl opacity-50 pointer-events-none" />
        
        <div className="container mx-auto px-4 relative z-10 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <GlobeIcon className="w-4 h-4" />
            <span>The remote-first professional network</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight max-w-4xl mb-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
            Where ambitious remote talent gets <span className="text-primary relative inline-block">discovered.<span className="absolute bottom-1 left-0 w-full h-2 bg-primary/20 -z-10 rounded-full"></span></span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
            ProConnect is the premium platform for builders, makers, and remote professionals to showcase their craft, connect with peers, and land defining roles.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md animate-in fade-in slide-in-from-bottom-10 duration-700 delay-200">
            <Link href="/profiles" className="w-full">
              <Button size="lg" className="w-full h-14 text-base rounded-xl font-semibold group shadow-lg shadow-primary/20">
                Explore Network
                <ArrowRightIcon className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/jobs" className="w-full">
              <Button size="lg" variant="outline" className="w-full h-14 text-base rounded-xl font-semibold bg-background/50 backdrop-blur-sm border-2">
                Find Remote Jobs
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Platform Stats */}
      <section className="py-12 border-y bg-background relative z-20 shadow-sm">
        <div className="container mx-auto px-4">
          {loadingStats ? (
            <div className="flex justify-center py-8"><ActivityIcon className="w-8 h-8 animate-spin text-primary/50" /></div>
          ) : stats ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
              <div className="flex flex-col items-center text-center space-y-2">
                <span className="text-4xl font-bold text-foreground">{stats.totalProfiles.toLocaleString()}</span>
                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Professionals</span>
              </div>
              <div className="flex flex-col items-center text-center space-y-2">
                <span className="text-4xl font-bold text-foreground">{stats.totalJobs.toLocaleString()}</span>
                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Active Jobs</span>
              </div>
              <div className="flex flex-col items-center text-center space-y-2">
                <span className="text-4xl font-bold text-foreground">{stats.openToWorkProfiles.toLocaleString()}</span>
                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Open to Work</span>
              </div>
              <div className="flex flex-col items-center text-center space-y-2">
                <span className="text-4xl font-bold text-primary">{stats.remoteJobsPostedThisWeek.toLocaleString()}</span>
                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">New This Week</span>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <div className="container mx-auto px-4 space-y-24 py-20">
        {/* Featured Profiles */}
        <section>
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-3xl font-bold mb-2">Featured Professionals</h2>
              <p className="text-muted-foreground">Discover top talent in the remote ecosystem.</p>
            </div>
            <Link href="/profiles">
              <Button variant="ghost" className="group hidden sm:flex">
                View all <ArrowRightIcon className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
          
          {loadingProfiles ? (
            <LoadingState message="Loading profiles..." />
          ) : featuredProfiles?.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProfiles.map(profile => (
                <ProfileCard key={profile.id} profile={profile} featured />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-2xl border border-dashed">
              No featured profiles found.
            </div>
          )}
          
          <div className="mt-6 sm:hidden">
            <Link href="/profiles">
              <Button variant="outline" className="w-full">View all professionals</Button>
            </Link>
          </div>
        </section>

        {/* Featured Jobs */}
        <section>
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-3xl font-bold mb-2">Top Remote Opportunities</h2>
              <p className="text-muted-foreground">The best roles from forward-thinking companies.</p>
            </div>
            <Link href="/jobs">
              <Button variant="ghost" className="group hidden sm:flex">
                View all <ArrowRightIcon className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
          
          {loadingJobs ? (
            <LoadingState message="Loading jobs..." />
          ) : featuredJobs?.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredJobs.map(job => (
                <JobCard key={job.id} job={job} featured />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-2xl border border-dashed">
              No featured jobs found.
            </div>
          )}
          
          <div className="mt-6 sm:hidden">
            <Link href="/jobs">
              <Button variant="outline" className="w-full">View all jobs</Button>
            </Link>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-primary text-primary-foreground rounded-3xl p-8 md:p-16 text-center relative overflow-hidden shadow-2xl shadow-primary/20">
          <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-black/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 max-w-2xl mx-auto space-y-8">
            <h2 className="text-3xl md:text-5xl font-bold">Ready to stand out?</h2>
            <p className="text-lg md:text-xl text-primary-foreground/80">
              Create your profile today to showcase your experience, portfolio, and skills to the world's best remote companies.
            </p>
            <Link href="/profile/edit">
              <Button size="lg" variant="secondary" className="h-14 px-8 text-base font-bold rounded-xl text-primary hover:bg-white">
                Set up your profile
              </Button>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}