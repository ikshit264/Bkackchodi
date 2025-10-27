"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Users } from "lucide-react";
import { IoLogoInstagram } from "react-icons/io";
import { FaSquareXTwitter } from "react-icons/fa6";
import { BsLinkedin } from "react-icons/bs";
import img1 from "../../../public/developers/ikshit.jpg";
import img2 from "../../../public/developers/vidyasagar.jpg";
import img3 from "../../../public/developers/preet.png";
import img4 from "../../../public/developers/kedar.png";
import img5 from "../../../public/developers/apeksha.png";

const mentorDetails = [
  {
    name: "Ikshit Talera",
    role: "Lead Developer",
    image: img1,
    imageFallback: "IT",
    linkedin: "https://www.linkedin.com/in/ikshit04/",
    instagram: "https://leetcode.com/u/ikshit_04/",
    twitter: "https://x.com/Ikshit_04/",
    gradient: "from-primary-500 to-primary-600"
  },
  {
    name: "Vidyasagar Dadilwar",
    role: "Full Stack Developer",
    image: img2,
    imageFallback: "VD",
    linkedin: "https://linkedin.com/in/vidyasagar-dadilwar/",
    twitter: "https://x.com/",
    instagram: "https://instagram.com/",
    gradient: "from-secondary-500 to-secondary-600"
  },
  {
    name: "Kedar Khati",
    role: "Backend Developer",
    image: img4,
    imageFallback: "KK",
    twitter: "https://x.com/",
    instagram: "https://www.instagram.com/",
    linkedin: "https://www.linkedin.com/",
    gradient: "from-accent-500 to-accent-600"
  },
  {
    name: "Preet Mahadule",
    role: "Frontend Developer",
    image: img3,
    imageFallback: "PM",
    linkedin: "https://www.linkedin.com/",
    twitter: "https://x.com/",
    instagram: "https://www.instagram.com/",
    gradient: "from-purple-500 to-purple-600"
  },
  {
    name: "Apeksha Jamjar",
    role: "Backend Developer",
    image: img5,
    imageFallback: "AJ",
    linkedin: "https://www.linkedin.com/",
    twitter: "https://x.com/",
    instagram: "https://www.instagram.com/",
    gradient: "from-purple-500 to-purple-600"
  }
];

const MentorsSlider = () => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [resetTimeout, setResetTimeout] = useState<NodeJS.Timeout | null>(null);

  // Check if we're at the end of the scroll
  const checkIfAtEnd = () => {
    if (!scrollRef.current) return false;

    const isEnd =
      scrollRef.current.scrollLeft + scrollRef.current.clientWidth >=
      scrollRef.current.scrollWidth - 1;

    return isEnd;
  };

  useEffect(() => {
    if (!scrollRef.current || isPaused) return;

    const interval = setInterval(() => {
      if (scrollRef.current) {
        const atEnd = checkIfAtEnd();

        if (atEnd) {
          if (resetTimeout) clearTimeout(resetTimeout);

          const timeout = setTimeout(() => {
            if (!isPaused && scrollRef.current) {
              scrollRef.current.scrollTo({ left: 0, behavior: "smooth" });
              // setCurrentIndex(0);
            }
          }, 2000);

          setResetTimeout(timeout);
        } else {
          scrollRef.current.scrollBy({ left: 320, behavior: "smooth" });
          // setCurrentIndex(prev => (prev + 1) % mentorDetails.length);
        }
      }
    }, 3000);

    return () => {
      clearInterval(interval);
      if (resetTimeout) clearTimeout(resetTimeout);
    };
  }, [isPaused, resetTimeout]);

  useEffect(() => {
    const scrollContainer = scrollRef.current;

    if (!scrollContainer) return;

    const handleScroll = () => {
      checkIfAtEnd();
    };

    scrollContainer.addEventListener("scroll", handleScroll);

    return () => {
      scrollContainer.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Social media icon component
  const SocialIcon = ({ type, url }: { type: 'linkedin' | 'twitter' | 'instagram', url: string }) => {
    if (!url) return null;
    
    let icon;
    let hoverColor;
    
    switch (type) {
      case 'linkedin':
        icon = <BsLinkedin size={20} />;
        hoverColor = "hover:text-blue-500";
        break;
      case 'twitter':
        icon = <FaSquareXTwitter size={20} />;
        hoverColor = "hover:text-gray-800";
        break;
      case 'instagram':
        icon = <IoLogoInstagram size={20} />;
        hoverColor = "hover:text-pink-500";
        break;
      default:
        return null;
    }
    
    return (
      <motion.a
        whileHover={{ scale: 1.2, y: -2 }}
        whileTap={{ scale: 0.9 }}
        className={`cursor-pointer text-neutral-600 dark:text-neutral-400 ${hoverColor} transition-all duration-300 p-2 rounded-lg hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50`}
        href={url}
        target="_blank"
        rel="noreferrer"
        aria-label={`${type} profile`}
      >
        {icon}
      </motion.a>
    );
  };

  return (
    <section className="relative w-full py-20 sm:py-24 md:py-32 bg-gradient-to-b from-neutral-100/20 dark:from-neutral-800/20 to-background overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.05, 0.1, 0.05]
          }}
          transition={{ 
            duration: 10, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
          className="absolute top-1/3 right-1/4 w-96 h-96 bg-gradient-to-r from-primary-500/10 to-secondary-500/10 rounded-full blur-3xl"
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
            className="inline-flex items-center space-x-2 bg-gradient-to-r from-primary-500/10 to-secondary-500/10 px-4 py-2 rounded-full mb-6"
          >
            <Users className="w-5 h-5 text-primary-500" />
            <span className="text-sm font-medium text-primary-500">Meet The Team</span>
          </motion.div>
          
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-display font-bold mb-6">
            Our{" "}
            <span className="text-gradient">Developers</span>
          </h2>
          
          <p className="text-xl text-neutral-600 dark:text-neutral-400 max-w-3xl mx-auto leading-relaxed">
            The brilliant minds behind GitSmart&apos;s AI-powered learning platform
          </p>
        </motion.div>

        {/* Slider Container */}
        <div className="relative">
          <div
            ref={scrollRef}
            className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth space-x-6 py-4"
            style={{ 
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
            onMouseEnter={() => {
              setIsPaused(true);
              if (resetTimeout) clearTimeout(resetTimeout);
            }}
            onMouseLeave={() => setIsPaused(false)}
          >
            {/* Custom CSS for hiding scrollbar */}
            <style jsx global>{`
              .scroll-smooth::-webkit-scrollbar {
                display: none;
              }
            `}</style>
            
            {mentorDetails.map((mentor, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="min-w-[320px] snap-center"
              >
                <motion.div
                  whileHover={{ 
                    y: -8,
                    scale: 1.02,
                    transition: { duration: 0.3 }
                  }}
                  className="group relative h-full p-6 card-glass hover:shadow-glow transition-all duration-500"
                >
                  {/* Background gradient on hover */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${mentor.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500 rounded-2xl`} />
                  
                  {/* Profile Image */}
                  <div className="relative z-10 mb-6">
                    <div className="relative w-48 h-48 mx-auto">
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        className="relative w-full h-full rounded-2xl overflow-hidden shadow-medium group-hover:shadow-glow transition-all duration-300"
                      >
                        <Image
                          className="object-cover transition-transform duration-500 group-hover:scale-110"
                          src={mentor.image}
                          alt={mentor.name}
                          fill
                          style={{ objectFit: 'cover' }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </motion.div>
                      
                      {/* Status indicator */}
                      <motion.div
                        initial={{ scale: 0 }}
                        whileInView={{ scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        viewport={{ once: true }}
                        className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-r ${mentor.gradient} flex items-center justify-center shadow-medium`}
                      >
                        <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                      </motion.div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="relative z-10 text-center">
                    <motion.h3
                      whileHover={{ scale: 1.05 }}
                      className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2 group-hover:text-gradient transition-all duration-300"
                    >
                      {mentor.name}
                    </motion.h3>
                    
                    <motion.p
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      transition={{ duration: 0.5, delay: 0.4 }}
                      viewport={{ once: true }}
                      className="text-sm text-neutral-600 dark:text-neutral-400 mb-6"
                    >
                      {mentor.role}
                    </motion.p>
                    
                    {/* Social Media Icons */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.5 }}
                      viewport={{ once: true }}
                      className="flex justify-center items-center gap-4"
                    >
                      {mentor.linkedin && (
                        <SocialIcon type="linkedin" url={mentor.linkedin} />
                      )}
                      {mentor.twitter && (
                        <SocialIcon type="twitter" url={mentor.twitter} />
                      )}
                      {mentor.instagram && (
                        <SocialIcon type="instagram" url={mentor.instagram} />
                      )}
                    </motion.div>
                  </div>

                  {/* Decorative elements */}
                  <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <div className={`w-6 h-6 rounded-full bg-gradient-to-r ${mentor.gradient}`} />
                  </div>
                  <div className="absolute bottom-4 left-4 opacity-5 group-hover:opacity-15 transition-opacity">
                    <div className={`w-4 h-4 rounded-full bg-gradient-to-r ${mentor.gradient}`} />
                  </div>
                </motion.div>
              </motion.div>
            ))}
          </div>
          
          {/* Navigation buttons */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 p-3 glass rounded-2xl hover:shadow-glow transition-all duration-300 z-20"
            onClick={() => {
              if (scrollRef.current) {
                scrollRef.current.scrollBy({ left: -320, behavior: "smooth" });
                // setCurrentIndex(prev => prev === 0 ? mentorDetails.length - 1 : prev - 1);
              }
            }}
          >
            <ChevronLeft size={24} className="text-gray-900 dark:text-gray-100" />
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 p-3 glass rounded-2xl hover:shadow-glow transition-all duration-300 z-20"
            onClick={() => {
              if (scrollRef.current) {
                scrollRef.current.scrollBy({ left: 320, behavior: "smooth" });
                // setCurrentIndex(prev => (prev + 1) % mentorDetails.length);
              }
            }}
          >
            <ChevronRight size={24} className="text-gray-900 dark:text-gray-100" />
          </motion.button>
        </div>
      </div>
    </section>
  );
};

export default MentorsSlider;