"use client";

import * as React from "react";
import {
  Map,
  Database,
  FileText,
  Users,
  Megaphone,
  LineChart,
  Settings,
  GalleryVerticalEnd,
  Cable,
  Brain,
  ImageUp,
} from "lucide-react";

import { NavMain } from "@/components/layout/nav-main";
import { NavProjects } from "@/components/layout/nav-projects";
import { NavUser } from "@/components/layout/nav-user";
import { TeamSwitcher } from "@/components/layout/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";

const data = {
  user: {
    name: "Admin",
    email: "admin@infracorridors.com",
    avatar: "/avatars/admin.jpg",
  },

  teams: [
    {
      name: "Infracorridors",
      logo: GalleryVerticalEnd,
      plan: "Admin",
    },
  ],

  navMain: [

    {
      title: "Master Data",
      url: "/admin/master",
      icon: Database,
      items: [
        { title: "Category Classifications", url: "/admin/master/category-classifications" },
        { title: "Categories", url: "/admin/master/categories" },
        { title: "Companies / Vendors", url: "/admin/master/vendors" },
         { title: "Corridors", url: "/admin/corridors" },
      ],
    },
  

    {
      title: "Upload Images",
      url: "/admin/upload-images",
      icon: FileText,
      items: [
        { title: "Corridor Images", url: "/admin/upload-map-images" },
        { title: "Cable Images", url: "/admin/upload-cable-images" },
      ],
    },  
     {
      title: "Sync Cables Data",
      url: "/admin/sync-cables",
      icon: Cable,
      items: [{ title: "Sync Cables", url: "/admin/sync-cables" }],
    },
    {
      title: "Blogs Management",
      url: "/admin/blogs",
      icon: FileText,
      items: [
        { title: "Blogs", url: "/admin/blogs" },

      ],
    },
    {
      title: "RFPs",
      url: "/admin/rfps",
      icon: Megaphone,
      items: [
        { title: "All RFPs", url: "/admin/rfps" },
      ],
    },
        // {
    //   title: "Corridors",
    //   url: "/admin/corridors",
    //   icon: Map,
    //   isActive: true,
    //   items: [
    //     { title: "All Corridors", url: "/admin/corridors" },
    //     { title: "Create Corridor", url: "/admin/corridors/new" },
    //     { title: "City Corridors*", url: "/admin/corridors/city-to-city" },
    //     {
    //       title: "Country Corridors*",
    //       url: "/admin/corridors/country-to-country",
    //     },
    //   ],
    // },

    //   {
    //   title: "User Management*",
    //   url: "/admin/users",
    //   icon: Users,
    //   items: [
    //     { title: "Admins", url: "/admin/users/admins" },
    //     { title: "Users", url: "/admin/users/users" },
    //     // { title: "Buyers", url: "/admin/users/buyers" },
    //     // { title: "Sellers", url: "/admin/users/sellers" },
    //   ],
    // },
    {
      title:"Map Tool",
      url:"https://map.infracorridors.com/",
      icon:Map,
      target: "_blank",
     
    }

   

   
  ],

  projects: [],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        {/* <NavProjects projects={data.projects} /> */}
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
